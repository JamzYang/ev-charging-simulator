"use client"

import { ArrowLeft, Zap, ArrowRight, Home, Map, Clock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface Charger {
  id: number
  name: string
  status: "Available" | "In Use" | "Unavailable"
}

interface StationDetailsProps {
  stationId: string
}

const chargers: Charger[] = [
  { id: 1, name: "Charger #1", status: "Available" },
  { id: 2, name: "Charger #2", status: "In Use" },
  { id: 3, name: "Charger #3", status: "Available" },
  { id: 4, name: "Charger #4", status: "Unavailable" },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case "Available":
      return "text-green-600"
    case "In Use":
      return "text-orange-600"
    case "Unavailable":
      return "text-red-600"
    default:
      return "text-[#4b819b]"
  }
}

export default function StationDetails({ stationId }: StationDetailsProps) {
  const router = useRouter()

  return (
    <div className="relative flex min-h-screen flex-col bg-[#f8fbfc] font-sans justify-between">
      <div>
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
        <h1 className="text-[#0d171c] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 text-left pb-3 pt-5">
          Green Energy Station
        </h1>
        <p className="text-[#0d171c] text-base font-normal leading-normal pb-3 pt-1 px-4">
          123 Electric Avenue, Cityville
        </p>

        {/* Chargers Section */}
        <h2 className="text-[#0d171c] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
          Chargers
        </h2>

        {/* Chargers List */}
        <div className="space-y-0">
          {chargers.map((charger) => (
            <div
              key={charger.id}
              className="flex items-center gap-4 bg-[#f8fbfc] px-4 min-h-[72px] py-2 justify-between cursor-pointer hover:bg-[#f0f6f8] transition-colors"
              onClick={() => {
                // Navigate to charger details or start charging flow
                console.log(`Selected ${charger.name}`)
              }}
            >
              <div className="flex items-center gap-4">
                <div className="text-[#0d171c] flex items-center justify-center rounded-lg bg-[#e7eff3] shrink-0 size-12">
                  <Zap className="h-6 w-6" />
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[#0d171c] text-base font-medium leading-normal line-clamp-1">{charger.name}</p>
                  <p className={`text-sm font-normal leading-normal line-clamp-2 ${getStatusColor(charger.status)}`}>
                    {charger.status}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <ArrowRight className="h-6 w-6 text-[#0d171c]" />
              </div>
            </div>
          ))}
        </div>
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
