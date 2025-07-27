"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Wifi, 
  WifiOff, 
  Settings, 
  Monitor, 
  Zap, 
  RefreshCw,
  Power,
  PowerOff,
  Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useHeartbeatManager } from "@/hooks/useHeartbeatManager"
import { getAllChargePoints } from "@/lib/api/stations"
import { ChargePoint } from "@/types/charging"
import { toast } from "react-hot-toast"

// 充电桩控制卡片
function ChargerControlCard({ 
  chargePoint, 
  isOnline, 
  onToggle 
}: { 
  chargePoint: ChargePoint
  isOnline: boolean
  onToggle: (online: boolean) => void
}) {
  const [loading, setLoading] = useState(false)

  const handleToggle = async (checked: boolean) => {
    setLoading(true)
    try {
      await onToggle(checked)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isOnline ? 'bg-green-100' : 'bg-gray-100'}`}>
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{chargePoint.name}</h3>
            <p className="text-sm text-gray-500">
              {chargePoint.chargePointId}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-1 rounded-full ${
                isOnline 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {isOnline ? '在线' : '离线'}
              </span>
              <span className="text-xs text-gray-500">
                {chargePoint.connectors.length} 个连接器
              </span>
            </div>
          </div>
        </div>
        
        <Switch
          checked={isOnline}
          onCheckedChange={handleToggle}
          disabled={loading}
        />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [chargePoints, setChargePoints] = useState<ChargePoint[]>([])
  const [loading, setLoading] = useState(true)

  const {
    connectionStatuses,
    isInitializing,
    startChargerHeartbeat,
    stopChargerHeartbeat,
    startAllHeartbeats,
    stopAllHeartbeats,
    getConnectionStats,
    updateConnectionStatuses
  } = useHeartbeatManager()

  useEffect(() => {
    const loadChargePoints = async () => {
      try {
        setLoading(true)
        const response = await getAllChargePoints({ page: 0, size: 100 })
        setChargePoints(response.data.content)
      } catch (error) {
        console.error('加载充电桩列表失败:', error)
        toast.error('加载充电桩列表失败')
      } finally {
        setLoading(false)
      }
    }

    loadChargePoints()
  }, [])

  const handleChargerToggle = async (chargePointId: string, online: boolean) => {
    if (online) {
      const success = await startChargerHeartbeat(chargePointId)
      if (!success) {
        throw new Error('启动失败')
      }
    } else {
      stopChargerHeartbeat(chargePointId)
    }
  }

  const handleStartAll = async () => {
    await startAllHeartbeats()
  }

  const handleStopAll = () => {
    stopAllHeartbeats()
  }

  const connectionStats = getConnectionStats()
  const isChargerOnline = (chargePointId: string) => {
    return connectionStatuses.some(status => 
      status.chargePointId === chargePointId && status.connected
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
          Developer Settings
        </h2>
      </div>

      {/* Connection Overview */}
      <div className="px-4 py-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">连接状态概览</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">在线充电桩</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {connectionStats.connected}/{connectionStats.total}
            </div>
            <div className="text-sm text-gray-500">
              {connectionStats.total > 0 ? Math.round(connectionStats.connectionRate) : 0}% 连接率
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">系统状态</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {isInitializing ? '初始化中' : '运行中'}
            </div>
            <div className="text-sm text-gray-500">
              WebSocket 连接管理
            </div>
          </div>
        </div>

        {/* Batch Controls */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={handleStartAll}
            disabled={isInitializing}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Power className="h-4 w-4 mr-2" />
            全部上线
          </Button>
          <Button
            onClick={handleStopAll}
            disabled={isInitializing}
            variant="destructive"
            className="flex-1"
          >
            <PowerOff className="h-4 w-4 mr-2" />
            全部离线
          </Button>
          <Button
            onClick={updateConnectionStatuses}
            variant="outline"
            size="icon"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Individual Charger Controls */}
      <div className="px-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">充电桩控制</h3>
        
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg p-4 border border-gray-200 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
                    <div>
                      <div className="h-4 w-24 bg-gray-200 rounded mb-1"></div>
                      <div className="h-3 w-32 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="w-11 h-6 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {chargePoints.map((chargePoint) => (
              <ChargerControlCard
                key={chargePoint.chargePointId}
                chargePoint={chargePoint}
                isOnline={isChargerOnline(chargePoint.chargePointId)}
                onToggle={(online) => handleChargerToggle(chargePoint.chargePointId, online)}
              />
            ))}
          </div>
        )}

        {!loading && chargePoints.length === 0 && (
          <div className="text-center py-12">
            <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无充电桩数据</p>
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="px-4 py-6 mt-auto">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">调试信息</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>WebSocket URL: {process.env.NEXT_PUBLIC_WEBSOCKET_URL}</p>
            <p>API URL: {process.env.NEXT_PUBLIC_API_BASE_URL}</p>
            <p>心跳间隔: {process.env.NEXT_PUBLIC_HEARTBEAT_INTERVAL}ms</p>
            <p>调试模式: {process.env.NEXT_PUBLIC_DEBUG_MODE}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
