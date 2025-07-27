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

      // 3. 为每个充电桩建立连接
      const connectionPromises = allChargePoints.map(async (chargePoint, index) => {
        try {
          await ocppWebSocketManager.connect(chargePoint.chargePointId)
          
          // 发送初始状态通知
          await ocppWebSocketManager.sendStatusNotification(
            chargePoint.chargePointId, 
            1, 
            'Available'
          )
          
          // 更新进度
          setInitializationProgress(50 + ((index + 1) / allChargePoints.length) * 50)
          
          return chargePoint.chargePointId
        } catch (error) {
          console.error(`连接充电桩 ${chargePoint.chargePointId} 失败:`, error)
          return null
        }
      })

      const results = await Promise.allSettled(connectionPromises)
      const successCount = results.filter(result =>
        result.status === 'fulfilled' && result.value !== null
      ).length

      const failedResults = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[]

      console.log(`成功连接 ${successCount}/${allChargePoints.length} 个充电桩`)

      // 分析失败原因
      const networkErrors = failedResults.filter(r =>
        r.reason?.message?.includes('网络') || r.reason?.message?.includes('offline')
      ).length

      const timeoutErrors = failedResults.filter(r =>
        r.reason?.message?.includes('超时') || r.reason?.message?.includes('timeout')
      ).length

      // 显示详细的成功/失败提示
      if (successCount === allChargePoints.length) {
        toast.success(`所有 ${successCount} 个充电桩连接成功`)
      } else if (successCount > 0) {
        toast.success(`成功连接 ${successCount}/${allChargePoints.length} 个充电桩`)

        // 显示失败原因统计
        if (networkErrors > 0) {
          toast.error(`${networkErrors} 个充电桩网络连接失败`)
        }
        if (timeoutErrors > 0) {
          toast.error(`${timeoutErrors} 个充电桩连接超时`)
        }
        if (failedResults.length - networkErrors - timeoutErrors > 0) {
          toast.error(`${failedResults.length - networkErrors - timeoutErrors} 个充电桩连接失败`)
        }
      } else {
        if (networkErrors === failedResults.length) {
          toast.error('所有充电桩连接失败：网络连接问题')
        } else if (timeoutErrors === failedResults.length) {
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
      } else {
        toast.error(`充电桩 ${chargePointId} 上线失败: ${errorMessage}`)
      }
      return false
    }
  }, [updateConnectionStatuses])

  // 停止单个充电桩心跳
  const stopChargerHeartbeat = useCallback((chargePointId: string) => {
    try {
      // 移除错误处理器
      ocppWebSocketManager.offError(chargePointId)
      ocppWebSocketManager.disconnect(chargePointId)
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
  const stopMultipleChargers = useCallback((chargePointIds: string[]) => {
    chargePointIds.forEach(id => stopChargerHeartbeat(id))
    toast.success(`已停止 ${chargePointIds.length} 个充电桩`)
  }, [stopChargerHeartbeat])

  // 停止所有充电桩
  const stopAllHeartbeats = useCallback(() => {
    try {
      ocppWebSocketManager.disconnectAll()
      updateConnectionStatuses()
      toast.success('所有充电桩已离线')
    } catch (error) {
      console.error('停止所有心跳失败:', error)
      toast.error('停止所有充电桩失败')
    }
  }, [])

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
