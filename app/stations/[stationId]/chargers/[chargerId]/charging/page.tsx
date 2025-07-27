"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Zap, Battery, Clock, Thermometer, Gauge, StopCircle, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ChargePoint, Connector, ChargingSession } from "@/types/charging"
import { getChargePointDetail, startCharging, stopCharging } from "@/lib/api/stations"
import { ocppWebSocketManager } from "@/lib/websocket/OCPPWebSocketManager"
import { useChargingStore, formatDuration, formatEnergy, formatPower } from "@/lib/store/chargingStore"
import { toast } from "react-hot-toast"

// 充电数据卡片组件
function ChargingDataCard({ 
  icon: Icon, 
  label, 
  value, 
  unit, 
  color = "text-blue-600" 
}: {
  icon: any
  label: string
  value: string | number
  unit: string
  color?: string
}) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-5 w-5 ${color}`} />
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <span className="text-sm text-gray-500">{unit}</span>
      </div>
    </div>
  )
}

// 圆形进度指示器
function CircularProgress({ 
  percentage, 
  size = 120, 
  strokeWidth = 8,
  color = "#0fa8ef"
}: {
  percentage: number
  size?: number
  strokeWidth?: number
  color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{percentage.toFixed(0)}%</div>
          <div className="text-xs text-gray-500">SOC</div>
        </div>
      </div>
    </div>
  )
}

export default function ChargingPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const stationId = params.stationId as string
  const chargerId = params.chargerId as string
  const connectorId = parseInt(searchParams.get('connectorId') || '1')
  
  const [chargePoint, setChargePoint] = useState<ChargePoint | null>(null)
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const {
    currentSession,
    chargingData,
    chargingStatus,
    chargingDuration,
    startChargingSession,
    updateChargingStatus,
    endChargingSession,
    resetChargingData
  } = useChargingStore()

  useEffect(() => {
    const loadChargePointData = async () => {
      try {
        setLoading(true)
        const response = await getChargePointDetail(chargerId)
        const chargePointData = response.data
        setChargePoint(chargePointData)
        
        // 找到选中的连接器
        const connector = chargePointData.connectors.find(c => c.connectorId === connectorId)
        if (connector) {
          setSelectedConnector(connector)
        } else {
          toast.error('未找到指定的连接器')
          router.back()
        }
      } catch (error) {
        console.error('加载充电桩数据失败:', error)
        toast.error('加载充电桩数据失败')
        router.back()
      } finally {
        setLoading(false)
      }
    }

    if (chargerId) {
      loadChargePointData()
    }
  }, [chargerId, connectorId, router])

  // 启动充电
  const handleStartCharging = async () => {
    if (!chargePoint || !selectedConnector) {
      toast.error('充电桩信息不完整')
      return
    }

    try {
      setActionLoading(true)
      
      // 生成模拟的idTag
      const idTag = `USER_${Date.now()}`
      
      // 调用API启动充电
      const response = await startCharging(chargerId, {
        connectorId,
        idTag
      })

      if (response.data.status === 'ACCEPTED') {
        // 创建充电会话
        const session: ChargingSession = {
          sessionId: `session_${Date.now()}`,
          chargePointId: chargerId,
          connectorId,
          transactionId: Math.floor(Math.random() * 10000), // 模拟事务ID
          idTag,
          status: 'preparing',
          startTime: new Date().toISOString(),
          meterStart: 0,
          currentMeter: 0,
          power: 0,
          voltage: 0,
          current: 0
        }

        // 启动充电会话
        startChargingSession(session)
        
        // 模拟状态变化：准备中 -> 充电中
        setTimeout(() => {
          updateChargingStatus('charging')
          toast.success('充电已开始')
        }, 2000)

        toast.success('正在启动充电...')
      } else {
        toast.error('启动充电失败')
      }
    } catch (error) {
      console.error('启动充电失败:', error)
      toast.error('启动充电失败')
    } finally {
      setActionLoading(false)
    }
  }

  // 停止充电
  const handleStopCharging = async () => {
    if (!currentSession) {
      toast.error('没有正在进行的充电会话')
      return
    }

    try {
      setActionLoading(true)
      updateChargingStatus('finishing')

      // 调用API停止充电
      const response = await stopCharging(chargerId, {
        transactionId: currentSession.transactionId || 0
      })

      if (response.data.status === 'ACCEPTED') {
        // 结束充电会话
        endChargingSession()
        
        setTimeout(() => {
          toast.success('充电已停止')
          // 跳转回充电站详情页
          router.push(`/stations/${stationId}`)
        }, 2000)
      } else {
        toast.error('停止充电失败')
        updateChargingStatus('charging') // 恢复充电状态
      }
    } catch (error) {
      console.error('停止充电失败:', error)
      toast.error('停止充电失败')
      updateChargingStatus('charging') // 恢复充电状态
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusText = () => {
    switch (chargingStatus) {
      case 'preparing':
        return '准备中...'
      case 'charging':
        return '充电中'
      case 'finishing':
        return '结束中...'
      case 'completed':
        return '充电完成'
      default:
        return '已连接'
    }
  }

  const getStatusColor = () => {
    switch (chargingStatus) {
      case 'preparing':
        return 'text-yellow-600'
      case 'charging':
        return 'text-green-600'
      case 'finishing':
        return 'text-orange-600'
      case 'completed':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen flex-col bg-[#f8fbfc] font-sans">
        <div className="flex items-center bg-[#f8fbfc] p-4 pb-2 justify-between">
          <Button variant="ghost" size="icon" className="text-[#0d171c] hover:bg-transparent">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h2 className="text-[#0d171c] text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
            Charging
          </h2>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#f8fbfc] font-sans">
      {/* Header */}
      <div className="flex items-center bg-[#f8fbfc] p-4 pb-2 justify-between">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-[#0d171c] hover:bg-transparent"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-[#0d171c] text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
          Charging
        </h2>
      </div>

      {/* Status Section */}
      <div className="px-4 py-6 text-center">
        <h1 className="text-[#0d171c] text-[22px] font-bold leading-tight tracking-[-0.015em] mb-2">
          {chargePoint?.name}
        </h1>
        <p className={`text-base font-medium mb-4 ${getStatusColor()}`}>
          {getStatusText()}
        </p>
        
        {chargingStatus === 'idle' && (
          <p className="text-[#0d171c] text-base font-normal leading-normal">
            Your vehicle is now connected to the charger. You can start the charging process.
          </p>
        )}
      </div>

      {/* Charging Progress */}
      {(chargingStatus === 'charging' || chargingStatus === 'preparing' || chargingStatus === 'finishing') && (
        <div className="px-4 py-6 flex justify-center">
          <CircularProgress percentage={chargingData.soc || 0} />
        </div>
      )}

      {/* Charging Data Grid */}
      {chargingStatus === 'charging' && (
        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChargingDataCard
              icon={Zap}
              label="功率"
              value={formatPower(chargingData.power)}
              unit=""
              color="text-blue-600"
            />
            <ChargingDataCard
              icon={Battery}
              label="电量"
              value={formatEnergy(chargingData.energy)}
              unit=""
              color="text-green-600"
            />
            <ChargingDataCard
              icon={Gauge}
              label="电压"
              value={chargingData.voltage.toFixed(1)}
              unit="V"
              color="text-purple-600"
            />
            <ChargingDataCard
              icon={Thermometer}
              label="温度"
              value={chargingData.temperature?.toFixed(1) || '25.0'}
              unit="°C"
              color="text-orange-600"
            />
          </div>

          {/* Duration */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">充电时长</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {formatDuration(chargingDuration)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="px-4 py-6 mt-auto">
        {chargingStatus === 'idle' && (
          <Button
            onClick={handleStartCharging}
            disabled={actionLoading}
            className="w-full h-12 bg-[#0fa8ef] hover:bg-[#0fa8ef]/90 text-white text-base font-bold"
          >
            {actionLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Starting...
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Start Charging
              </>
            )}
          </Button>
        )}

        {(chargingStatus === 'charging' || chargingStatus === 'preparing') && (
          <Button
            onClick={handleStopCharging}
            disabled={actionLoading}
            variant="destructive"
            className="w-full h-12 text-base font-bold"
          >
            {actionLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Stopping...
              </>
            ) : (
              <>
                <StopCircle className="h-5 w-5 mr-2" />
                Stop Charging
              </>
            )}
          </Button>
        )}

        {chargingStatus === 'completed' && (
          <Button
            onClick={() => router.push(`/stations/${stationId}`)}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-base font-bold"
          >
            Back to Station
          </Button>
        )}
      </div>
    </div>
  )
}
