"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Zap, Battery, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChargingStation, ChargePoint } from "@/types/charging"
import { getStationDetail, getStationChargePoints } from "@/lib/api/stations"
import { toast } from "react-hot-toast"

// 充电桩卡片组件
function ChargePointCard({ chargePoint, onSelect }: { 
  chargePoint: ChargePoint
  onSelect: () => void 
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'text-green-600'
      case 'Charging':
        return 'text-blue-600'
      case 'Preparing':
        return 'text-yellow-600'
      case 'Faulted':
      case 'Unavailable':
        return 'text-red-600'
      default:
        return 'text-gray-600'
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

  const isClickable = chargePoint.isAvailableForCharging

  return (
    <div 
      className={`flex items-center gap-4 bg-[#f8fbfc] px-4 min-h-[72px] py-2 justify-between ${
        isClickable ? 'cursor-pointer hover:bg-[#e7eff3] transition-colors' : 'opacity-60'
      }`}
      onClick={isClickable ? onSelect : undefined}
    >
      <div className="flex items-center gap-4">
        <div className="text-[#0d171c] flex items-center justify-center rounded-lg bg-[#e7eff3] shrink-0 size-12">
          <Zap className="h-6 w-6" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-[#0d171c] text-base font-medium leading-normal line-clamp-1">
            {chargePoint.name}
          </p>
          <div className="flex items-center gap-2">
            <p className={`text-sm font-normal leading-normal line-clamp-2 ${getStatusColor(chargePoint.status)}`}>
              {getStatusText(chargePoint.status)}
            </p>
            {chargePoint.maxPowerFormatted && (
              <span className="text-[#4b819b] text-xs">
                • {chargePoint.maxPowerFormatted}
              </span>
            )}
          </div>
          
          {/* 连接器信息 */}
          <div className="flex items-center gap-2 mt-1">
            {chargePoint.connectors.map((connector, index) => (
              <div key={index} className="flex items-center gap-1 text-xs text-[#4b819b]">
                {connector.connectorType?.includes('DC') || connector.connectorType === 'GB_DC' ? (
                  <Battery className="h-3 w-3" />
                ) : (
                  <Zap className="h-3 w-3" />
                )}
                <span>{connector.displayName}</span>
                <span className={getStatusColor(connector.status)}>
                  ({getStatusText(connector.status)})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {isClickable && (
        <div className="shrink-0">
          <div className="text-[#0d171c] flex size-7 items-center justify-center">
            <ArrowLeft className="h-6 w-6 rotate-180" />
          </div>
        </div>
      )}
      
      {!isClickable && (
        <div className="shrink-0">
          <AlertCircle className="h-5 w-5 text-gray-400" />
        </div>
      )}
    </div>
  )
}

// 骨架屏组件
function ChargePointSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-[#f8fbfc] px-4 min-h-[72px] py-2 justify-between">
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-gray-200 shrink-0 size-12 animate-pulse"></div>
        <div className="flex flex-col justify-center gap-2">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex gap-2">
            <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
      <div className="shrink-0">
        <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  )
}

export default function StationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const stationId = params.stationId as string
  
  const [station, setStation] = useState<ChargingStation | null>(null)
  const [chargePoints, setChargePoints] = useState<ChargePoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStationData = async () => {
      try {
        setLoading(true)
        
        const [stationResponse, chargePointsResponse] = await Promise.all([
          getStationDetail(stationId),
          getStationChargePoints(stationId)
        ])
        
        setStation(stationResponse.data)
        setChargePoints(chargePointsResponse.data)
        
      } catch (error) {
        console.error('加载充电站数据失败:', error)
        toast.error('加载充电站数据失败')
      } finally {
        setLoading(false)
      }
    }

    if (stationId) {
      loadStationData()
    }
  }, [stationId])

  const handleChargePointSelect = (chargePoint: ChargePoint) => {
    if (!chargePoint.isAvailableForCharging) {
      toast.error('该充电桩当前不可用')
      return
    }

    // 找到可用的连接器
    const availableConnector = chargePoint.connectors.find(c => c.isAvailableForCharging)
    if (!availableConnector) {
      toast.error('该充电桩没有可用的连接器')
      return
    }

    // 跳转到充电枪选择页面
    router.push(`/stations/${stationId}/chargers/${chargePoint.chargePointId}`)
  }

  const availableCount = chargePoints.filter(cp => cp.isAvailableForCharging).length
  const totalCount = chargePoints.length

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
          Station Details
        </h2>
      </div>

      {/* Station Info */}
      {loading ? (
        <div className="px-4">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-5 w-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      ) : station ? (
        <>
          <h1 className="text-[#0d171c] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 text-left pb-3 pt-5">
            {station.name}
          </h1>
          <p className="text-[#0d171c] text-base font-normal leading-normal pb-3 pt-1 px-4">
            {station.address}
          </p>
          {station.description && (
            <p className="text-[#4b819b] text-sm font-normal leading-normal pb-3 px-4">
              {station.description}
            </p>
          )}
        </>
      ) : (
        <div className="px-4 py-8 text-center">
          <p className="text-red-500">充电站信息加载失败</p>
        </div>
      )}

      {/* Chargers Section */}
      <div className="flex items-center justify-between px-4 pb-3 pt-5">
        <h2 className="text-[#0d171c] text-[22px] font-bold leading-tight tracking-[-0.015em]">
          Chargers
        </h2>
        {!loading && (
          <div className="text-[#4b819b] text-sm">
            {availableCount}/{totalCount} 可用
          </div>
        )}
      </div>

      {/* Chargers List */}
      <div className="flex-1">
        {loading ? (
          <>
            <ChargePointSkeleton />
            <ChargePointSkeleton />
            <ChargePointSkeleton />
          </>
        ) : chargePoints.length > 0 ? (
          chargePoints.map((chargePoint) => (
            <ChargePointCard
              key={chargePoint.chargePointId}
              chargePoint={chargePoint}
              onSelect={() => handleChargePointSelect(chargePoint)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">该充电站暂无充电桩</p>
          </div>
        )}
      </div>
    </div>
  )
}
