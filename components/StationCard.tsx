"use client"

import { ChargingStation } from "@/types/charging"
import { ArrowRight, Zap, Battery } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo } from "react"

interface StationCardProps {
  station: ChargingStation
  chargePointsData?: any[]
}

export default function StationCard({ station, chargePointsData = [] }: StationCardProps) {
  const router = useRouter()

  // 计算充电枪统计信息
  const chargingStats = useMemo(() => {
    if (!chargePointsData.length) {
      return {
        totalConnectors: 0,
        availableConnectors: 0,
        acConnectors: 0,
        dcConnectors: 0
      }
    }

    let totalConnectors = 0
    let availableConnectors = 0
    let acConnectors = 0
    let dcConnectors = 0

    chargePointsData.forEach(chargePoint => {
      if (chargePoint.connectors) {
        chargePoint.connectors.forEach((connector: any) => {
          totalConnectors++
          
          if (connector.isAvailableForCharging) {
            availableConnectors++
          }
          
          if (connector.connectorType?.includes('AC') || connector.connectorType === 'GB_AC') {
            acConnectors++
          } else if (connector.connectorType?.includes('DC') || connector.connectorType === 'GB_DC') {
            dcConnectors++
          }
        })
      }
    })

    return {
      totalConnectors,
      availableConnectors,
      acConnectors,
      dcConnectors
    }
  }, [chargePointsData])

  const handleStationClick = () => {
    router.push(`/stations/${station.stationId}`)
  }

  return (
    <div className="p-4">
      <div className="flex items-stretch justify-between gap-4 rounded-xl">
        <div className="flex flex-[2_2_0px] flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[#4b819b] text-sm font-normal leading-normal">
              {station.distance || '-- mi'}
            </p>
            <p className="text-[#0d171c] text-base font-bold leading-tight">
              {station.name}
            </p>
            <p className="text-[#4b819b] text-sm font-normal leading-normal">
              {station.address}
            </p>
            
            {/* 充电枪统计信息 */}
            {chargingStats.totalConnectors > 0 && (
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1 text-xs text-[#4b819b]">
                  <Zap className="h-3 w-3" />
                  <span>AC: {chargingStats.acConnectors}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#4b819b]">
                  <Battery className="h-3 w-3" />
                  <span>DC: {chargingStats.dcConnectors}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#4b819b]">
                  <span>总计: {chargingStats.totalConnectors}</span>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handleStationClick}
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-8 px-4 flex-row-reverse bg-[#e7eff3] text-[#0d171c] pr-2 gap-1 text-sm font-medium leading-normal w-fit hover:bg-[#d1e7ed] transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span className="truncate">
              {chargingStats.availableConnectors > 0 
                ? `${chargingStats.availableConnectors} available`
                : 'No available'
              }
            </span>
          </button>
        </div>
        
        <div className="flex-1">
          <div
            className="aspect-video w-full rounded-xl bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: station.image 
                ? `url("${station.image}")` 
                : `url("/placeholder.svg?height=120&width=160")`
            }}
          />
        </div>
      </div>
    </div>
  )
}

// 骨架屏组件
export function StationCardSkeleton() {
  return (
    <div className="p-4">
      <div className="flex items-stretch justify-between gap-4 rounded-xl">
        <div className="flex flex-[2_2_0px] flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex items-center gap-3 mt-1">
              <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="h-8 w-24 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
        <div className="flex-1">
          <div className="aspect-video w-full rounded-xl bg-gray-200 animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}
