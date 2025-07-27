"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Zap, Battery, AlertCircle, Plug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChargePoint, Connector } from "@/types/charging"
import { getChargePointDetail } from "@/lib/api/stations"
import { toast } from "react-hot-toast"

// 连接器卡片组件
function ConnectorCard({ 
  connector, 
  chargePointId, 
  onSelect 
}: { 
  connector: Connector
  chargePointId: string
  onSelect: () => void 
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'Charging':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'Preparing':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'Faulted':
      case 'Unavailable':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Available':
        return '可用'
      case 'Charging':
        return '充电中'
      case 'Preparing':
        return '准备中'
      case 'Faulted':
        return '故障'
      case 'Unavailable':
        return '不可用'
      case 'Offline':
        return '离线'
      default:
        return status
    }
  }

  const getConnectorIcon = () => {
    if (connector.connectorType?.includes('DC') || connector.connectorType === 'GB_DC') {
      return <Battery className="h-8 w-8" />
    }
    return <Zap className="h-8 w-8" />
  }

  const isAvailable = connector.isAvailableForCharging

  return (
    <div 
      className={`border rounded-xl p-4 transition-all ${
        isAvailable 
          ? 'cursor-pointer hover:shadow-md ' + getStatusColor(connector.status)
          : 'opacity-60 ' + getStatusColor(connector.status)
      }`}
      onClick={isAvailable ? onSelect : undefined}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center rounded-lg bg-white/50 shrink-0 size-16">
          {getConnectorIcon()}
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {connector.displayName}
          </h3>
          <p className="text-sm text-gray-600 mb-1">
            {connector.connectorTypeDescription}
          </p>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${getStatusColor(connector.status).split(' ')[0]}`}>
              {getStatusText(connector.status)}
            </span>
            {connector.maxPowerFormatted && (
              <span className="text-sm text-gray-500">
                • {connector.maxPowerFormatted}
              </span>
            )}
          </div>
          
          {/* 充电类型标识 */}
          <div className="flex items-center gap-2 mt-2">
            {connector.isFastCharging && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                快充
              </span>
            )}
            {connector.isSuperCharging && (
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                超充
              </span>
            )}
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
              {connector.connectorType}
            </span>
          </div>
        </div>
        
        {isAvailable ? (
          <div className="shrink-0">
            <ArrowLeft className="h-6 w-6 rotate-180 text-gray-400" />
          </div>
        ) : (
          <div className="shrink-0">
            <AlertCircle className="h-6 w-6 text-gray-400" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChargerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const stationId = params.stationId as string
  const chargerId = params.chargerId as string
  
  const [chargePoint, setChargePoint] = useState<ChargePoint | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadChargePointData = async () => {
      try {
        setLoading(true)
        const response = await getChargePointDetail(chargerId)
        setChargePoint(response.data)
      } catch (error) {
        console.error('加载充电桩数据失败:', error)
        toast.error('加载充电桩数据失败')
      } finally {
        setLoading(false)
      }
    }

    if (chargerId) {
      loadChargePointData()
    }
  }, [chargerId])

  const handleConnectorSelect = (connector: Connector) => {
    if (!connector.isAvailableForCharging) {
      toast.error('该连接器当前不可用')
      return
    }

    // 跳转到插枪页面
    router.push(`/stations/${stationId}/chargers/${chargerId}/connect?connectorId=${connector.connectorId}`)
  }

  const availableConnectors = chargePoint?.connectors.filter(c => c.isAvailableForCharging) || []

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
          Select Connector
        </h2>
      </div>

      {/* Charger Info */}
      {loading ? (
        <div className="px-4 py-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
      ) : chargePoint ? (
        <div className="px-4 py-6">
          <h1 className="text-[#0d171c] text-[22px] font-bold leading-tight tracking-[-0.015em] mb-2">
            {chargePoint.name}
          </h1>
          <p className="text-[#4b819b] text-base font-normal leading-normal mb-1">
            {chargePoint.statusDescription}
          </p>
          {chargePoint.maxPowerFormatted && (
            <p className="text-[#4b819b] text-sm font-normal leading-normal">
              最大功率: {chargePoint.maxPowerFormatted}
            </p>
          )}
        </div>
      ) : (
        <div className="px-4 py-8 text-center">
          <p className="text-red-500">充电桩信息加载失败</p>
        </div>
      )}

      {/* Connectors Section */}
      <div className="px-4 pb-3">
        <h2 className="text-[#0d171c] text-lg font-semibold leading-tight tracking-[-0.015em] mb-4">
          选择连接器
        </h2>
        
        {availableConnectors.length === 0 && !loading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800 text-sm">
                当前没有可用的连接器，请选择其他充电桩
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Connectors List */}
      <div className="flex-1 px-4 space-y-3">
        {loading ? (
          <>
            <div className="border rounded-xl p-4 bg-gray-50 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="size-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-5 w-32 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
            <div className="border rounded-xl p-4 bg-gray-50 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="size-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-5 w-32 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </>
        ) : chargePoint?.connectors.length ? (
          chargePoint.connectors.map((connector) => (
            <ConnectorCard
              key={connector.connectorId}
              connector={connector}
              chargePointId={chargerId}
              onSelect={() => handleConnectorSelect(connector)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Plug className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">该充电桩暂无连接器信息</p>
          </div>
        )}
      </div>
    </div>
  )
}
