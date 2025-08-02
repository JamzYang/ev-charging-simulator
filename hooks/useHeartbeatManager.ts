import { useCallback, useEffect, useState } from "react"
import { ocppWebSocketManager } from "@/lib/websocket/OCPPWebSocketManager"
import { getStations, getStationChargePoints } from "@/lib/api/stations"
import { ConnectionStatus } from "@/types/charging"
import { toast } from "react-hot-toast"

export function useHeartbeatManager() {
  const [connectionStatuses, setConnectionStatuses] = useState<ConnectionStatus[]>([])
  const [isInitializing, setIsInitializing] = useState(false)
  const [initializationProgress, setInitializationProgress] = useState(0)

  // 更新连接状态
  const updateConnectionStatuses = useCallback(() => {
    const statuses = ocppWebSocketManager.getAllConnectionStatus()
    setConnectionStatuses(statuses)
  }, [])

  // 启动所有充电枪的心跳
  const startAllHeartbeats = useCallback(async () => {
    setIsInitializing(true)
    setInitializationProgress(0)
    
    try {
      console.log('开始初始化所有充电桩连接...')
      
      // 1. 获取所有充电站
      const stationsResponse = await getStations({ page: 0, size: 100 })
      const stations = stationsResponse.data.content
      console.log(`获取到 ${stations.length} 个充电站`)

      // 2. 获取所有充电桩
      const allChargePoints = []
      for (let i = 0; i < stations.length; i++) {
        const station = stations[i]
        try {
          const chargePointsResponse = await getStationChargePoints(station.stationId)
          allChargePoints.push(...chargePointsResponse.data)
          setInitializationProgress(((i + 1) / stations.length) * 50) // 前50%进度用于获取数据
        } catch (error) {
          console.error(`获取充电站 ${station.stationId} 的充电桩失败:`, error)
        }
      }

      console.log(`获取到 ${allChargePoints.length} 个充电桩`)

      // 3. 去重充电桩ID
      const uniqueChargePoints = Array.from(
        new Map(allChargePoints.map(cp => [cp.chargePointId, cp])).values()
      )

      if (uniqueChargePoints.length !== allChargePoints.length) {
        console.warn(`发现重复充电桩ID，去重后: ${uniqueChargePoints.length}/${allChargePoints.length}`)
      }

      // 4. 串行建立连接（避免并发竞争）
      let successCount = 0
      let networkErrors = 0
      let timeoutErrors = 0
      let duplicateErrors = 0
      let otherErrors = 0

      for (let i = 0; i < uniqueChargePoints.length; i++) {
        const chargePoint = uniqueChargePoints[i]

        try {
          // 设置错误处理器
          ocppWebSocketManager.onError(chargePoint.chargePointId, (error) => {
            console.error(`充电桩 ${chargePoint.chargePointId} 错误:`, error)

            // 错误分类统计
            if (error.message.includes('网络') || error.message.includes('offline')) {
              networkErrors++
            } else if (error.message.includes('超时') || error.message.includes('timeout')) {
              timeoutErrors++
            } else if (error.message.includes('already exists') || error.message.includes('重复')) {
              duplicateErrors++
            } else {
              otherErrors++
            }
          })

          // 建立连接
          await ocppWebSocketManager.connect(chargePoint.chargePointId)

          // 发送初始状态通知
          await ocppWebSocketManager.sendStatusNotification(
            chargePoint.chargePointId,
            1,
            'Available'
          )

          successCount++

          // 更新进度
          setInitializationProgress(50 + ((i + 1) / uniqueChargePoints.length) * 50)

          // 短暂延迟，避免过快的连接请求
          if (i < uniqueChargePoints.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }

        } catch (error) {
          console.error(`连接充电桩 ${chargePoint.chargePointId} 失败:`, error)

          // 错误分类
          const errorMessage = (error as Error).message
          if (errorMessage.includes('网络') || errorMessage.includes('offline')) {
            networkErrors++
          } else if (errorMessage.includes('超时') || errorMessage.includes('timeout')) {
            timeoutErrors++
          } else if (errorMessage.includes('already exists') || errorMessage.includes('重复')) {
            duplicateErrors++
          } else {
            otherErrors++
          }
        }
      }

      console.log(`连接完成: 成功 ${successCount}/${uniqueChargePoints.length}`)
      console.log(`错误统计: 网络错误 ${networkErrors}, 超时错误 ${timeoutErrors}, 重复连接 ${duplicateErrors}, 其他错误 ${otherErrors}`)

      // 显示详细的成功/失败提示
      if (successCount === uniqueChargePoints.length) {
        toast.success(`所有 ${successCount} 个充电桩连接成功`)
      } else if (successCount > 0) {
        toast.success(`成功连接 ${successCount}/${uniqueChargePoints.length} 个充电桩`)

        // 显示失败原因统计
        if (duplicateErrors > 0) {
          toast.error(`${duplicateErrors} 个充电桩重复连接被拒绝`)
        }
        if (networkErrors > 0) {
          toast.error(`${networkErrors} 个充电桩网络连接失败`)
        }
        if (timeoutErrors > 0) {
          toast.error(`${timeoutErrors} 个充电桩连接超时`)
        }
        if (otherErrors > 0) {
          toast.error(`${otherErrors} 个充电桩连接失败`)
        }
      } else {
        if (duplicateErrors === uniqueChargePoints.length) {
          toast.error('所有充电桩连接失败：重复连接被拒绝，请检查是否有其他实例在运行')
        } else if (networkErrors === uniqueChargePoints.length) {
          toast.error('所有充电桩连接失败：网络连接问题')
        } else if (timeoutErrors === uniqueChargePoints.length) {
          toast.error('所有充电桩连接失败：连接超时')
        } else {
          toast.error('所有充电桩连接失败，请检查网络和服务器状态')
        }
      }
      
      // 更新连接状态
      updateConnectionStatuses()
      
    } catch (error) {
      console.error('启动心跳失败:', error)
      toast.error('初始化充电桩连接失败')
    } finally {
      setIsInitializing(false)
      setInitializationProgress(100)
    }
  }, [updateConnectionStatuses])

  // 启动单个充电桩心跳
  const startChargerHeartbeat = useCallback(async (chargePointId: string) => {
    try {
      // 设置错误处理器
      ocppWebSocketManager.onError(chargePointId, (error) => {
        console.error(`充电桩 ${chargePointId} 错误:`, error)
        if (error.message.includes('网络')) {
          toast.error(`网络连接问题: ${chargePointId}`)
        } else if (error.message.includes('超时')) {
          toast.error(`连接超时: ${chargePointId}`)
        } else if (error.message.includes('already exists')) {
          toast.error(`${chargePointId} 重复连接被拒绝`)
        } else if (error.message.includes('重连次数已达上限')) {
          toast.error(`${chargePointId} 连接失败，请检查网络`)
        }
      })

      await ocppWebSocketManager.connect(chargePointId)
      await ocppWebSocketManager.sendStatusNotification(chargePointId, 1, 'Available')
      updateConnectionStatuses()
      toast.success(`充电桩 ${chargePointId} 已上线`)
      return true
    } catch (error) {
      console.error(`启动充电桩 ${chargePointId} 心跳失败:`, error)
      const errorMessage = (error as Error).message
      if (errorMessage.includes('网络离线')) {
        toast.error('网络连接不可用，请检查网络设置')
      } else if (errorMessage.includes('连接超时')) {
        toast.error(`充电桩 ${chargePointId} 连接超时，请稍后重试`)
      } else if (errorMessage.includes('already exists')) {
        toast.error(`充电桩 ${chargePointId} 重复连接被拒绝，请检查是否有其他实例在运行`)
      } else {
        toast.error(`充电桩 ${chargePointId} 上线失败: ${errorMessage}`)
      }
      return false
    }
  }, [updateConnectionStatuses])

  // 停止单个充电桩心跳
  const stopChargerHeartbeat = useCallback(async (chargePointId: string) => {
    try {
      // 移除错误处理器
      ocppWebSocketManager.offError(chargePointId)
      await ocppWebSocketManager.disconnect(chargePointId)
      updateConnectionStatuses()
      toast.success(`充电桩 ${chargePointId} 已离线`)
    } catch (error) {
      console.error(`停止充电桩 ${chargePointId} 心跳失败:`, error)
      toast.error(`充电桩 ${chargePointId} 离线失败: ${(error as Error).message}`)
    }
  }, [updateConnectionStatuses])

  // 批量启动充电桩
  const startMultipleChargers = useCallback(async (chargePointIds: string[]) => {
    const promises = chargePointIds.map(id => startChargerHeartbeat(id))
    const results = await Promise.allSettled(promises)
    
    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value === true
    ).length
    
    if (successCount === chargePointIds.length) {
      toast.success(`成功启动 ${successCount} 个充电桩`)
    } else {
      toast.error(`${chargePointIds.length - successCount} 个充电桩启动失败`)
    }
    
    return successCount
  }, [startChargerHeartbeat])

  // 批量停止充电桩
  const stopMultipleChargers = useCallback(async (chargePointIds: string[]) => {
    const promises = chargePointIds.map(id => stopChargerHeartbeat(id))
    await Promise.allSettled(promises)
    toast.success(`已停止 ${chargePointIds.length} 个充电桩`)
  }, [stopChargerHeartbeat])

  // 停止所有充电桩
  const stopAllHeartbeats = useCallback(async () => {
    try {
      await ocppWebSocketManager.disconnectAll()
      updateConnectionStatuses()
      toast.success('所有充电桩已离线')
    } catch (error) {
      console.error('停止所有心跳失败:', error)
      toast.error('停止所有充电桩失败')
    }
  }, [updateConnectionStatuses])

  // 重连所有充电桩
  const reconnectAllHeartbeats = useCallback(async () => {
    try {
      await ocppWebSocketManager.reconnectAll()
      updateConnectionStatuses()
      toast.success('所有充电桩重连完成')
    } catch (error) {
      console.error('重连所有充电桩失败:', error)
      toast.error('重连所有充电桩失败')
    }
  }, [updateConnectionStatuses])

  // 获取连接统计信息
  const getConnectionStats = useCallback(() => {
    const total = connectionStatuses.length
    const connected = connectionStatuses.filter(status => status.connected).length
    const disconnected = total - connected
    
    return {
      total,
      connected,
      disconnected,
      connectionRate: total > 0 ? (connected / total) * 100 : 0
    }
  }, [connectionStatuses])

  // 检查特定充电桩是否在线
  const isChargerOnline = useCallback((chargePointId: string) => {
    return ocppWebSocketManager.isConnected(chargePointId)
  }, [])

  // 获取在线充电桩列表
  const getOnlineChargers = useCallback(() => {
    return connectionStatuses
      .filter(status => status.connected)
      .map(status => status.chargePointId)
  }, [connectionStatuses])

  // 获取离线充电桩列表
  const getOfflineChargers = useCallback(() => {
    return connectionStatuses
      .filter(status => !status.connected)
      .map(status => status.chargePointId)
  }, [connectionStatuses])

  // 定期更新连接状态
  useEffect(() => {
    const interval = setInterval(updateConnectionStatuses, 10000) // 每10秒更新一次
    return () => clearInterval(interval)
  }, [updateConnectionStatuses])

  // 监听页面可见性变化，页面重新可见时更新状态
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateConnectionStatuses()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [updateConnectionStatuses])

  return {
    // 状态
    connectionStatuses,
    isInitializing,
    initializationProgress,
    
    // 操作方法
    startAllHeartbeats,
    startChargerHeartbeat,
    stopChargerHeartbeat,
    startMultipleChargers,
    stopMultipleChargers,
    stopAllHeartbeats,
    reconnectAllHeartbeats,
    updateConnectionStatuses,
    
    // 查询方法
    getConnectionStats,
    isChargerOnline,
    getOnlineChargers,
    getOfflineChargers,
  }
}
