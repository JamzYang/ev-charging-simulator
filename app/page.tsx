"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Search, Settings, Home, Map as MapIcon, Zap, Clock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { ChargingStation, ChargePoint } from "@/types/charging"
import { getStations, getStationChargePoints } from "@/lib/api/stations"
import { useHeartbeatManager } from "@/hooks/useHeartbeatManager"
import StationCard, { StationCardSkeleton } from "@/components/StationCard"
import { toast } from "react-hot-toast"

const filterTabs = ["All", "DC", "AC"]

export default function Page() {
  const [stations, setStations] = useState<ChargingStation[]>([])
  const [chargePointsMap, setChargePointsMap] = useState<Map<string, ChargePoint[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  const {
    startAllHeartbeats,
    isInitializing,
    initializationProgress,
    getConnectionStats
  } = useHeartbeatManager()

  // 初始化应用
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true)

        // 1. 获取充电站列表
        console.log('获取充电站列表...')
        const stationsResponse = await getStations({ page: 0, size: 50 })
        const stationsData = stationsResponse.data.content
        setStations(stationsData)

        // 2. 获取每个充电站的充电桩信息
        console.log('获取充电桩信息...')
        const chargePointsData = new Map<string, ChargePoint[]>()

        for (const station of stationsData) {
          try {
            const chargePointsResponse = await getStationChargePoints(station.stationId)
            chargePointsData.set(station.stationId, chargePointsResponse.data)
          } catch (error) {
            console.error(`获取充电站 ${station.stationId} 的充电桩失败:`, error)
            chargePointsData.set(station.stationId, [])
          }
        }

        setChargePointsMap(chargePointsData)

        // 3. 启动所有充电枪的心跳
        console.log('启动心跳管理...')
        await startAllHeartbeats()

        toast.success('应用初始化完成')

      } catch (error) {
        console.error('初始化失败:', error)
        toast.error('应用初始化失败，请检查网络连接')
      } finally {
        setLoading(false)
      }
    }

    initializeApp()
  }, [startAllHeartbeats])

  // 过滤充电站
  const filteredStations = stations.filter(station => {
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!station.name.toLowerCase().includes(query) &&
          !station.address.toLowerCase().includes(query)) {
        return false
      }
    }

    // 类型过滤
    if (activeFilter !== "All") {
      const chargePoints = chargePointsMap.get(station.stationId) || []
      const hasFilterType = chargePoints.some(cp =>
        cp.connectors.some(connector => {
          if (activeFilter === "DC") {
            return connector.connectorType?.includes('DC') || connector.connectorType === 'GB_DC'
          } else if (activeFilter === "AC") {
            return connector.connectorType?.includes('AC') || connector.connectorType === 'GB_AC'
          }
          return true
        })
      )
      if (!hasFilterType) return false
    }

    return true
  })

  const connectionStats = getConnectionStats()

  return (
    <div className="relative flex min-h-screen flex-col bg-[#f8fbfc] font-sans">
      {/* Header */}
      <div className="flex items-center bg-[#f8fbfc] p-4 pb-2 justify-between">
        <Button variant="ghost" size="icon" className="text-[#0d171c] hover:bg-transparent">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-[#0d171c] text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
          Charging
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-[#0d171c] hover:bg-transparent"
          onClick={() => router.push('/settings')}
        >
          <Settings className="h-6 w-6" />
        </Button>
      </div>

      {/* 连接状态指示器 */}
      {isInitializing && (
        <div className="px-4 py-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">正在初始化充电桩连接...</span>
              <span className="text-sm text-blue-600">{Math.round(initializationProgress)}%</span>
            </div>
            <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${initializationProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 连接统计 */}
      {!isInitializing && connectionStats.total > 0 && (
        <div className="px-4 py-2">
          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-700">
                充电桩连接: {connectionStats.connected}/{connectionStats.total}
              </span>
              <span className="text-green-600">
                {Math.round(connectionStats.connectionRate)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4b819b]" />
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 w-full rounded-xl border-none bg-[#e7eff3] pl-12 text-[#0d171c] placeholder:text-[#4b819b] focus:ring-0 focus:border-none focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 p-3 overflow-x-auto">
        {filterTabs.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-xl px-4 ${
              activeFilter === filter ? "bg-[#0d171c] text-white" : "bg-[#e7eff3] text-[#0d171c]"
            }`}
          >
            <p className="text-sm font-medium leading-normal">{filter}</p>
          </button>
        ))}
      </div>

      {/* Charging Stations List */}
      <div className="flex-1">
        {loading ? (
          // 骨架屏
          <>
            <StationCardSkeleton />
            <StationCardSkeleton />
            <StationCardSkeleton />
          </>
        ) : filteredStations.length > 0 ? (
          filteredStations.map((station) => (
            <StationCard
              key={station.stationId}
              station={station}
              chargePointsData={chargePointsMap.get(station.stationId) || []}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">
              {searchQuery || activeFilter !== "All"
                ? "没有找到符合条件的充电站"
                : "暂无充电站数据"
              }
            </p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-[#e7eff3] bg-[#f8fbfc]">
        <div className="flex gap-2 px-4 pb-3 pt-2">
          <a href="#" className="flex flex-1 flex-col items-center justify-end gap-1 text-[#4b819b]">
            <div className="flex h-8 items-center justify-center">
              <Home className="h-6 w-6" />
            </div>
            <p className="text-xs font-medium leading-normal tracking-[0.015em]">Home</p>
          </a>
          <a href="#" className="flex flex-1 flex-col items-center justify-end gap-1 text-[#4b819b]">
            <div className="flex h-8 items-center justify-center">
              <MapIcon className="h-6 w-6" />
            </div>
            <p className="text-xs font-medium leading-normal tracking-[0.015em]">Map</p>
          </a>
          <a href="#" className="flex flex-1 flex-col items-center justify-end gap-1 text-[#0d171c]">
            <div className="flex h-8 items-center justify-center">
              <Zap className="h-6 w-6 fill-current" />
            </div>
            <p className="text-xs font-medium leading-normal tracking-[0.015em]">Charging</p>
          </a>
          <a href="#" className="flex flex-1 flex-col items-center justify-end gap-1 text-[#4b819b]">
            <div className="flex h-8 items-center justify-center">
              <Clock className="h-6 w-6" />
            </div>
            <p className="text-xs font-medium leading-normal tracking-[0.015em]">History</p>
          </a>
          <a href="#" className="flex flex-1 flex-col items-center justify-end gap-1 text-[#4b819b]">
            <div className="flex h-8 items-center justify-center">
              <User className="h-6 w-6" />
            </div>
            <p className="text-xs font-medium leading-normal tracking-[0.015em]">Me</p>
          </a>
        </div>
        <div className="h-5 bg-[#f8fbfc]" />
      </div>
    </div>
  )
}
