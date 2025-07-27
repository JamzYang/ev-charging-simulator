"use client"

import { useState } from "react"
import { ArrowLeft, Search, ArrowRight, Home, Map, Zap, Clock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

const chargingStations = [
  {
    id: 1,
    name: "Greenlot",
    address: "123 Main St, Anytown",
    distance: "0.2 mi",
    available: 2,
    image: "/placeholder.svg?height=120&width=160",
  },
  {
    id: 2,
    name: "ChargePoint",
    address: "456 Oak Ave, Anytown",
    distance: "0.5 mi",
    available: 4,
    image: "/placeholder.svg?height=120&width=160",
  },
  {
    id: 3,
    name: "EVgo",
    address: "789 Pine Ln, Anytown",
    distance: "0.8 mi",
    available: 1,
    image: "/placeholder.svg?height=120&width=160",
  },
]

const filterTabs = ["All", "DC", "AC"]

export default function ChargingStations() {
  const [activeFilter, setActiveFilter] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  return (
    <div className="relative flex min-h-screen flex-col bg-[#f8fbfc] font-sans">
      {/* Header */}
      <div className="flex items-center bg-[#f8fbfc] p-4 pb-2 justify-between">
        <Button variant="ghost" size="icon" className="text-[#0d171c] hover:bg-transparent">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-[#0d171c] text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
          Charging
        </h2>
      </div>

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
        {chargingStations.map((station) => (
          <div key={station.id} className="p-4">
            <div className="flex items-stretch justify-between gap-4 rounded-xl">
              <div className="flex flex-[2_2_0px] flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-[#4b819b] text-sm font-normal leading-normal">{station.distance}</p>
                  <p className="text-[#0d171c] text-base font-bold leading-tight">{station.name}</p>
                  <p className="text-[#4b819b] text-sm font-normal leading-normal">{station.address}</p>
                </div>
                <div
                  onClick={() => router.push(`/station/${station.id}`)}
                  className="flex w-fit items-center justify-center gap-1 rounded-xl bg-[#e7eff3] px-4 py-2 text-sm font-medium leading-normal text-[#0d171c] cursor-pointer hover:bg-[#d1e7ed] transition-colors"
                >
                  <span className="truncate">{station.available} available</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
              <div className="flex-1">
                <div
                  className="aspect-video w-full rounded-xl bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${station.image}")` }}
                />
              </div>
            </div>
          </div>
        ))}
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
              <Map className="h-6 w-6" />
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
