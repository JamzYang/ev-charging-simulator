"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Plug, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChargePoint, Connector } from "@/types/charging"
import { getChargePointDetail } from "@/lib/api/stations"
import { ocppWebSocketManager } from "@/lib/websocket/OCPPWebSocketManager"
import { toast } from "react-hot-toast"

export default function ConnectChargerPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const stationId = params.stationId as string
  const chargerId = params.chargerId as string
  const connectorId = parseInt(searchParams.get('connectorId') || '1')
  
  const [chargePoint, setChargePoint] = useState<ChargePoint | null>(null)
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)

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

  const handleSimulateConnect = async () => {
    if (!selectedConnector || !chargePoint) {
      toast.error('连接器信息不完整')
      return
    }

    try {
      setConnecting(true)
      
      // 检查WebSocket连接状态
      const isConnected = ocppWebSocketManager.isConnected(chargerId)
      if (!isConnected) {
        toast.error('充电桩未连接，请稍后重试')
        return
      }

      // 发送状态通知：连接器已连接
      await ocppWebSocketManager.sendStatusNotification(
        chargerId,
        connectorId,
        'Preparing',
        'NoError'
      )

      // 模拟插枪延迟
      await new Promise(resolve => setTimeout(resolve, 2000))

      setConnected(true)
      toast.success('充电枪连接成功！')

      // 延迟跳转到充电页面
      setTimeout(() => {
        router.push(`/stations/${stationId}/chargers/${chargerId}/charging?connectorId=${connectorId}`)
      }, 1500)

    } catch (error) {
      console.error('模拟连接失败:', error)
      toast.error('连接失败，请重试')
    } finally {
      setConnecting(false)
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
            Connect Charger
          </h2>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
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
          disabled={connecting}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-[#0d171c] text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
          Connect Charger
        </h2>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Charger Image/Illustration */}
          <div className="@container px-4 py-6">
            <div className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-center items-center overflow-hidden bg-gradient-to-b from-blue-50 to-blue-100 rounded-xl min-h-[240px]">
              <div className="flex flex-col items-center">
                {connected ? (
                  <CheckCircle className="h-24 w-24 text-green-500 mb-4" />
                ) : connecting ? (
                  <Loader2 className="h-24 w-24 text-blue-500 animate-spin mb-4" />
                ) : (
                  <Plug className="h-24 w-24 text-gray-400 mb-4" />
                )}
                
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {chargePoint?.name}
                  </h3>
                  <p className="text-gray-600">
                    {selectedConnector?.displayName}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="px-4">
            <h1 className="text-[#0d171c] text-[22px] font-bold leading-tight tracking-[-0.015em] text-center pb-3 pt-5">
              {connected ? 'Connected!' : connecting ? 'Connecting...' : 'Connect Charger'}
            </h1>
            
            <p className="text-[#0d171c] text-base font-normal leading-normal pb-3 pt-1 text-center">
              {connected 
                ? 'Charger connected successfully. Redirecting to charging page...'
                : connecting 
                ? 'Please wait while we establish the connection...'
                : 'Please connect the charger to start the simulation.'
              }
            </p>

            {/* Connector Details */}
            {selectedConnector && !connected && (
              <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-2">连接器信息</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">类型:</span> {selectedConnector.connectorTypeDescription}</p>
                  <p><span className="font-medium">状态:</span> {selectedConnector.statusDescription}</p>
                  {selectedConnector.maxPowerFormatted && (
                    <p><span className="font-medium">最大功率:</span> {selectedConnector.maxPowerFormatted}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="px-4 py-6">
          {!connected && (
            <Button
              onClick={handleSimulateConnect}
              disabled={connecting || !selectedConnector?.isAvailableForCharging}
              className="w-full h-12 bg-[#0fa8ef] hover:bg-[#0fa8ef]/90 text-white text-base font-bold"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Simulate Connect Charger'
              )}
            </Button>
          )}
          
          {connected && (
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-600 font-medium">
                正在跳转到充电页面...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation - Hidden during connection process */}
      {!connecting && !connected && (
        <div className="border-t border-[#e7eff3] bg-[#f8fbfc]">
          <div className="flex gap-2 px-4 pb-3 pt-2">
            <a href="/" className="flex flex-1 flex-col items-center justify-end gap-1 text-[#4b819b]">
              <div className="flex h-8 items-center justify-center">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M218.83,103.77l-80-75.48a1.14,1.14,0,0,1-.11-.11,16,16,0,0,0-21.53,0l-.11.11L37.17,103.77A16,16,0,0,0,32,115.55V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V160h32v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V115.55A16,16,0,0,0,218.83,103.77ZM208,208H160V160a16,16,0,0,0-16-16H112a16,16,0,0,0-16,16v48H48V115.55l.11-.1L128,40l79.9,75.43.11.1Z"></path>
                </svg>
              </div>
              <p className="text-xs font-medium leading-normal tracking-[0.015em]">Home</p>
            </a>
            <a href="#" className="flex flex-1 flex-col items-center justify-end gap-1 text-[#4b819b]">
              <div className="flex h-8 items-center justify-center">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M228.92,49.69a8,8,0,0,0-6.86-1.45L160.93,63.52,99.58,32.84a8,8,0,0,0-5.52-.6l-64,16A8,8,0,0,0,24,56V200a8,8,0,0,0,9.94,7.76l61.13-15.28,61.35,30.68A8.15,8.15,0,0,0,160,224a8,8,0,0,0,1.94-.24l64-16A8,8,0,0,0,232,200V56A8,8,0,0,0,228.92,49.69ZM104,52.94l48,24V203.06l-48-24ZM40,62.25l48-12v127.5l-48,12Zm176,131.5-48,12V78.25l48-12Z"></path>
                </svg>
              </div>
              <p className="text-xs font-medium leading-normal tracking-[0.015em]">Map</p>
            </a>
            <a href="#" className="flex flex-1 flex-col items-center justify-end gap-1 text-[#0d171c]">
              <div className="flex h-8 items-center justify-center">
                <svg className="h-6 w-6 fill-current" viewBox="0 0 256 256">
                  <path d="M241,69.66,221.66,50.34a8,8,0,0,0-11.32,11.32L229.66,81A8,8,0,0,1,232,86.63V168a8,8,0,0,1-16,0V128a24,24,0,0,0-24-24H176V56a24,24,0,0,0-24-24H72A24,24,0,0,0,48,56V208H32a8,8,0,0,0,0,16H192a8,8,0,0,0,0-16H176V120h16a8,8,0,0,1,8,8v40a24,24,0,0,0,48,0V86.63A23.85,23.85,0,0,0,241,69.66ZM135.43,131l-16,40A8,8,0,0,1,104.57,165l11.61-29H96a8,8,0,0,1-7.43-11l16-40A8,8,0,1,1,119.43,91l-11.61,29H128a8,8,0,0,1,7.43,11Z"></path>
                </svg>
              </div>
              <p className="text-xs font-medium leading-normal tracking-[0.015em]">Charging</p>
            </a>
            <a href="#" className="flex flex-1 flex-col items-center justify-end gap-1 text-[#4b819b]">
              <div className="flex h-8 items-center justify-center">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M136,80v43.47l36.12,21.67a8,8,0,0,1-8.24,13.72l-40-24A8,8,0,0,1,120,128V80a8,8,0,0,1,16,0Zm-8-48A95.44,95.44,0,0,0,60.08,60.15C52.81,67.51,46.35,74.59,40,82V64a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H72a8,8,0,0,0,0-16H49c7.15-8.42,14.27-16.35,22.39-24.57a80,80,0,1,1,1.66,114.75,8,8,0,1,0-11,11.64A96,96,0,1,0,128,32Z"></path>
                </svg>
              </div>
              <p className="text-xs font-medium leading-normal tracking-[0.015em]">History</p>
            </a>
            <a href="#" className="flex flex-1 flex-col items-center justify-end gap-1 text-[#4b819b]">
              <div className="flex h-8 items-center justify-center">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path>
                </svg>
              </div>
              <p className="text-xs font-medium leading-normal tracking-[0.015em]">Me</p>
            </a>
          </div>
          <div className="h-5 bg-[#f8fbfc]" />
        </div>
      )}
    </div>
  )
}
