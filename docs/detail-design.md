# H5充电站模拟器应用开发设计文档

## 文档信息
- **版本**: v1.0.0
- **创建日期**: 2025-01-27
- **项目位置**: `c:\develop\learnspace\charge-simulator`
- **技术栈**: Next.js 15 + TypeScript + Tailwind CSS

## 目录
1. [项目概述](#1-项目概述)
2. [系统架构](#2-系统架构)
3. [数据结构设计](#3-数据结构设计)
4. [页面设计](#4-页面设计)
5. [WebSocket通信设计](#5-websocket通信设计)
6. [HTTP接口集成](#6-http接口集成)
7. [状态管理设计](#7-状态管理设计)
8. [开发计划](#8-开发计划)

---

## 1. 项目概述

### 1.1 功能目标
开发一个H5充电站模拟器应用，用户可以：
- 浏览充电站列表和详情
- 选择空闲充电枪进行模拟充电
- 体验完整的充电流程（插枪→启动→充电→结束）
- 实时查看充电进度和数据

### 1.2 核心特性
- **自动上线策略**: APP启动时自动模拟所有充电枪上线
- **开发者控制**: 提供手动控制充电枪在线/离线状态的功能
- **实时通信**: 基于WebSocket的OCPP1.6协议通信
- **状态同步**: 充电状态和数据的实时更新

---

## 2. 系统架构

### 2.1 整体架构图
```
┌─────────────────┐    HTTP     ┌─────────────────┐
│   H5前端应用    │ ──────────→ │  Station服务    │
│                 │             │                 │
│  - 页面展示     │             │  - 电站管理     │
│  - 用户交互     │             │  - 充电控制     │
│  - 状态管理     │             │  - 数据查询     │
└─────────────────┘             └─────────────────┘
         │                               │
         │ WebSocket                     │ 指令转发
         ▼                               ▼
┌─────────────────┐             ┌─────────────────┐
│   充电桩网关    │ ◄─────────► │  模拟充电枪     │
│                 │   OCPP1.6   │                 │
│  - 消息中转     │             │  - 状态模拟     │
│  - 协议转换     │             │  - 数据生成     │
└─────────────────┘             └─────────────────┘
```

### 2.2 通信流程
**插枪流程:**
```
前端 --WebSocket--> 网关 ---> 模拟充电枪
前端 <--WebSocket-- 网关 <--- 模拟充电枪 (StatusNotification)
```

**启动充电流程:**
```
前端 --HTTP--> Station服务 --指令--> 网关 ---> 模拟充电枪
前端 <--WebSocket-- 网关 <--- 模拟充电枪 (StartTransaction)
前端 <--WebSocket-- 网关 <--- 模拟充电枪 (MeterValues)
```

---

## 3. 数据结构设计

### 3.1 TypeScript接口定义

````typescript path=types/charging.ts mode=EDIT
// 充电站相关类型
export interface ChargingStation {
  stationId: string
  name: string
  address: string
  description?: string
  latitude: number
  longitude: number
  operatorId?: string
  status: StationStatus
  statusDescription: string
  openTime?: string
  closeTime?: string
  businessHoursFormatted?: string
  canProvideService: boolean
  createdAt?: string
  updatedAt?: string
  // 扩展字段
  distance?: string
  image?: string
}

// 充电桩类型
export interface ChargePoint {
  chargePointId: string
  stationId: string
  name: string
  model?: string
  vendor?: string
  serialNumber?: string
  firmwareVersion?: string
  status: DeviceStatus
  statusDescription: string
  lastHeartbeat?: string
  maxPower?: number
  maxPowerFormatted?: string
  isOnline: boolean
  isAvailableForCharging: boolean
  hasAvailableConnector: boolean
  availableConnectorCount: number
  connectors: Connector[]
  createdAt?: string
  updatedAt?: string
}

// 连接器类型
export interface Connector {
  connectorId: number
  connectorType: ConnectorType
  connectorTypeDescription: string
  status: DeviceStatus
  statusDescription: string
  maxPower?: number
  maxPowerFormatted?: string
  isAvailableForCharging: boolean
  isCharging: boolean
  isOffline: boolean
  isFastCharging: boolean
  isSuperCharging: boolean
  displayName: string
  createdAt?: string
  updatedAt?: string
}

// 充电会话类型
export interface ChargingSession {
  sessionId: string
  chargePointId: string
  connectorId: number
  transactionId?: number
  idTag: string
  status: 'preparing' | 'charging' | 'finishing' | 'completed'
  startTime: string
  endTime?: string
  meterStart: number
  meterStop?: number
  currentMeter: number
  power: number
  voltage: number
  current: number
}

// 状态枚举
export type StationStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
export type DeviceStatus = 'Available' | 'Preparing' | 'Charging' | 'SuspendedEVSE' | 
  'SuspendedEV' | 'Finishing' | 'Reserved' | 'Unavailable' | 'Faulted' | 'Offline'
export type ConnectorType = 'GB_DC' | 'GB_AC' | 'TYPE2' | 'CCS1' | 'CCS2' | 'CHADEMO' | 'TESLA'

// OCPP消息类型
export interface OCPPMessage {
  messageType: 2 | 3 | 4
  messageId: string
  action?: string
  payload: any
}

// WebSocket连接状态
export interface ConnectionStatus {
  chargePointId: string
  connected: boolean
  lastHeartbeat?: string
  connectionTime?: string
}
````

### 3.2 API响应类型

````typescript path=types/api.ts mode=EDIT
// 统一响应格式
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  errorCode?: string
  timestamp: string
}

// 分页响应
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
  hasNext: boolean
  hasPrevious: boolean
}

// 命令响应
export interface CommandResponse {
  commandId: string
  status: 'ACCEPTED' | 'REJECTED'
  message: string
}
````

---

## 4. 页面设计

### 4.1 页面结构
```
app/
├── page.tsx                    # 首页 - 充电站列表
├── stations/
│   └── [stationId]/
│       ├── page.tsx           # 充电站详情页
│       └── chargers/
│           └── [chargerId]/
│               ├── page.tsx   # 充电枪详情页
│               ├── connect/
│               │   └── page.tsx # 插枪页面
│               └── charging/
│                   └── page.tsx # 充电过程页面
└── settings/
    └── page.tsx               # 设置页面（开发者选项）
```

### 4.2 页面功能设计

#### 4.2.1 首页 - 充电站列表

````tsx path=app/page.tsx mode=EDIT
"use client"

import { useEffect, useState } from "react"
import { ChargingStation } from "@/types/charging"
import { getStations } from "@/lib/api/stations"
import StationCard from "@/components/StationCard"
import { useHeartbeatManager } from "@/hooks/useHeartbeatManager"

export default function HomePage() {
  const [stations, setStations] = useState<ChargingStation[]>([])
  const [loading, setLoading] = useState(true)
  const { startAllHeartbeats } = useHeartbeatManager()

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. 获取充电站列表
        const response = await getStations({ page: 0, size: 50 })
        setStations(response.data.content)
        
        // 2. 启动所有充电枪的心跳
        await startAllHeartbeats()
        
      } catch (error) {
        console.error('初始化失败:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeApp()
  }, [])

  if (loading) {
    return <div className="p-4">加载中...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-semibold">充电站</h1>
      </header>
      
      <div className="p-4 space-y-4">
        {stations.map((station) => (
          <StationCard key={station.stationId} station={station} />
        ))}
      </div>
    </div>
  )
}
````

#### 4.2.2 充电站详情页

````tsx path=app/stations/[stationId]/page.tsx mode=EDIT
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChargingStation, ChargePoint } from "@/types/charging"
import { getStationDetail, getStationChargePoints } from "@/lib/api/stations"
import ChargePointCard from "@/components/ChargePointCard"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

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
        const [stationResponse, chargePointsResponse] = await Promise.all([
          getStationDetail(stationId),
          getStationChargePoints(stationId)
        ])
        
        setStation(stationResponse.data)
        setChargePoints(chargePointsResponse.data)
      } catch (error) {
        console.error('加载充电站数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStationData()
  }, [stationId])

  if (loading) {
    return <div className="p-4">加载中...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">{station?.name}</h1>
      </header>

      <div className="p-4">
        <div className="bg-white rounded-lg p-4 mb-4">
          <p className="text-gray-600">{station?.address}</p>
          <p className="text-sm text-gray-500 mt-1">{station?.description}</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-medium">充电枪列表</h2>
          {chargePoints.map((chargePoint) => (
            <ChargePointCard 
              key={chargePoint.chargePointId} 
              chargePoint={chargePoint}
              onSelect={() => {
                if (chargePoint.isAvailableForCharging) {
                  router.push(`/stations/${stationId}/chargers/${chargePoint.chargePointId}`)
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
````

---

## 5. WebSocket通信设计

### 5.1 WebSocket管理器

````typescript path=lib/websocket/OCPPWebSocketManager.ts mode=EDIT
import { OCPPMessage, ConnectionStatus } from "@/types/charging"

export class OCPPWebSocketManager {
  private connections: Map<string, WebSocket> = new Map()
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map()
  private messageHandlers: Map<string, (message: OCPPMessage) => void> = new Map()
  
  constructor(private baseUrl: string = 'ws://localhost:8080/ocpp') {}

  // 连接充电桩
  async connect(chargePointId: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/${chargePointId}`
      const ws = new WebSocket(url, ['ocpp1.6'])
      
      return new Promise((resolve, reject) => {
        ws.onopen = () => {
          console.log(`充电桩 ${chargePointId} 连接成功`)
          this.connections.set(chargePointId, ws)
          this.startHeartbeat(chargePointId)
          this.sendBootNotification(chargePointId)
          resolve(true)
        }

        ws.onmessage = (event) => {
          const message: OCPPMessage = JSON.parse(event.data)
          this.handleMessage(chargePointId, message)
        }

        ws.onerror = (error) => {
          console.error(`充电桩 ${chargePointId} 连接错误:`, error)
          reject(error)
        }

        ws.onclose = () => {
          console.log(`充电桩 ${chargePointId} 连接关闭`)
          this.cleanup(chargePointId)
        }
      })
    } catch (error) {
      console.error(`连接充电桩 ${chargePointId} 失败:`, error)
      return false
    }
  }

  // 断开连接
  disconnect(chargePointId: string) {
    const ws = this.connections.get(chargePointId)
    if (ws) {
      ws.close()
      this.cleanup(chargePointId)
    }
  }

  // 发送启动通知
  private sendBootNotification(chargePointId: string) {
    const message: OCPPMessage = [
      2,
      this.generateMessageId(),
      "BootNotification",
      {
        chargePointVendor: "SimulatorVendor",
        chargePointModel: "SimulatorModel",
        chargePointSerialNumber: chargePointId,
        firmwareVersion: "1.0.0"
      }
    ]
    this.sendMessage(chargePointId, message)
  }

  // 发送心跳
  private sendHeartbeat(chargePointId: string) {
    const message: OCPPMessage = [
      2,
      this.generateMessageId(),
      "Heartbeat",
      {}
    ]
    this.sendMessage(chargePointId, message)
  }

  // 发送状态通知
  sendStatusNotification(chargePointId: string, connectorId: number, status: string, errorCode: string = "NoError") {
    const message: OCPPMessage = [
      2,
      this.generateMessageId(),
      "StatusNotification",
      {
        connectorId,
        errorCode,
        status,
        timestamp: new Date().toISOString(),
        info: `Connector ${connectorId} status: ${status}`
      }
    ]
    this.sendMessage(chargePointId, message)
  }

  // 发送开始交易
  sendStartTransaction(chargePointId: string, connectorId: number, idTag: string) {
    const message: OCPPMessage = [
      2,
      this.generateMessageId(),
      "StartTransaction",
      {
        connectorId,
        idTag,
        meterStart: 0,
        timestamp: new Date().toISOString()
      }
    ]
    this.sendMessage(chargePointId, message)
  }

  // 发送电表数据
  sendMeterValues(chargePointId: string, connectorId: number, transactionId: number, values: any) {
    const message: OCPPMessage = [
      2,
      this.generateMessageId(),
      "MeterValues",
      {
        connectorId,
        transactionId,
        meterValue: [{
          timestamp: new Date().toISOString(),
          sampledValue: values
        }]
      }
    ]
    this.sendMessage(chargePointId, message)
  }

  // 发送停止交易
  sendStopTransaction(chargePointId: string, transactionId: number, meterStop: number, reason: string = "Local") {
    const message: OCPPMessage = [
      2,
      this.generateMessageId(),
      "StopTransaction",
      {
        transactionId,
        meterStop,
        timestamp: new Date().toISOString(),
        reason
      }
    ]
    this.sendMessage(chargePointId, message)
  }

  // 发送消息
  private sendMessage(chargePointId: string, message: OCPPMessage) {
    const ws = this.connections.get(chargePointId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  // 处理接收到的消息
  private handleMessage(chargePointId: string, message: OCPPMessage) {
    const [messageType, messageId, actionOrPayload, payload] = message

    if (messageType === 2) { // Call
      this.handleCall(chargePointId, messageId, actionOrPayload, payload)
    } else if (messageType === 3) { // CallResult
      this.handleCallResult(chargePointId, messageId, actionOrPayload)
    } else if (messageType === 4) { // CallError
      this.handleCallError(chargePointId, messageId, actionOrPayload, payload)
    }

    // 通知外部处理器
    const handler = this.messageHandlers.get(chargePointId)
    if (handler) {
      handler(message)
    }
  }

  // 处理Call消息
  private handleCall(chargePointId: string, messageId: string, action: string, payload: any) {
    console.log(`收到 ${chargePointId} 的 ${action} 请求:`, payload)
    
    // 根据不同的action处理并响应
    switch (action) {
      case 'RemoteStartTransaction':
        this.sendCallResult(chargePointId, messageId, { status: 'Accepted' })
        // 模拟启动充电
        setTimeout(() => {
          this.sendStatusNotification(chargePointId, payload.connectorId, 'Preparing')
          setTimeout(() => {
            this.sendStartTransaction(chargePointId, payload.connectorId, payload.idTag)
          }, 2000)
        }, 1000)
        break
        
      case 'RemoteStopTransaction':
        this.sendCallResult(chargePointId, messageId, { status: 'Accepted' })
        // 模拟停止充电
        setTimeout(() => {
          this.sendStopTransaction(chargePointId, payload.transactionId, 1500)
          this.sendStatusNotification(chargePointId, 1, 'Available')
        }, 1000)
        break
        
      default:
        this.sendCallResult(chargePointId, messageId, {})
    }
  }

  // 发送CallResult响应
  private sendCallResult(chargePointId: string, messageId: string, payload: any) {
    const message: OCPPMessage = [3, messageId, payload]
    this.sendMessage(chargePointId, message)
  }

  // 处理CallResult消息
  private handleCallResult(chargePointId: string, messageId: string, payload: any) {
    console.log(`收到 ${chargePointId} 的响应:`, payload)
  }

  // 处理CallError消息
  private handleCallError(chargePointId: string, messageId: string, errorCode: string, errorDescription: string) {
    console.error(`收到 ${chargePointId} 的错误:`, errorCode, errorDescription)
  }

  // 启动心跳
  private startHeartbeat(chargePointId: string) {
    const interval = setInterval(() => {
      this.sendHeartbeat(chargePointId)
    }, 300000) // 5分钟心跳间隔
    
    this.heartbeatIntervals.set(chargePointId, interval)
  }

  // 清理资源
  private cleanup(chargePointId: string) {
    this.connections.delete(chargePointId)
    
    const interval = this.heartbeatIntervals.get(chargePointId)
    if (interval) {
      clearInterval(interval)
      this.heartbeatIntervals.delete(chargePointId)
    }
    
    this.messageHandlers.delete(chargePointId)
  }

  // 注册消息处理器
  onMessage(chargePointId: string, handler: (message: OCPPMessage) => void) {
    this.messageHandlers.set(chargePointId, handler)
  }

  // 生成消息ID
  private generateMessageId(): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    return `sim-${timestamp}-${random}`
  }

  // 获取连接状态
  getConnectionStatus(chargePointId: string): ConnectionStatus {
    const ws = this.connections.get(chargePointId)
    return {
      chargePointId,
      connected: ws ? ws.readyState === WebSocket.OPEN : false,
      lastHeartbeat: new Date().toISOString(),
      connectionTime: new Date().toISOString()
    }
  }

  // 获取所有连接状态
  getAllConnectionStatus(): ConnectionStatus[] {
    return Array.from(this.connections.keys()).map(chargePointId => 
      this.getConnectionStatus(chargePointId)
    )
  }
}

// 单例实例
export const ocppWebSocketManager = new OCPPWebSocketManager()
````

### 5.2 心跳管理Hook

````typescript path=hooks/useHeartbeatManager.ts mode=EDIT
import { useCallback, useEffect, useState } from "react"
import { ocppWebSocketManager } from "@/lib/websocket/OCPPWebSocketManager"
import { getStations, getStationChargePoints } from "@/lib/api/stations"
import { ConnectionStatus } from "@/types/charging"

export function useHeartbeatManager() {
  const [connectionStatuses, setConnectionStatuses] = useState<ConnectionStatus[]>([])
  const [isInitializing, setIsInitializing] = useState(false)

  // 启动所有充电枪的心跳
  const startAllHeartbeats = useCallback(async () => {
    setIsInitializing(true)
    try {
      // 1. 获取所有充电站
      const stationsResponse = await getStations({ page: 0, size: 100 })
      const stations = stationsResponse.data.content

      // 2. 获取所有充电桩
      const allChargePoints = []
      for (const station of stations) {
        const chargePointsResponse = await getStationChargePoints(station.stationId)
        allChargePoints.push(...chargePointsResponse.data)
      }

      // 3. 为每个充电桩建立连接
      const connectionPromises = allChargePoints.map(async (chargePoint) => {
        try {
          await ocppWebSocketManager.connect(chargePoint.chargePointId)
          // 发送初始状态通知
          ocppWebSocketManager.sendStatusNotification(
            chargePoint.chargePointId, 
            1, 
            'Available'
          )
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

      console.log(`成功连接 ${successCount}/${allChargePoints.length} 个充电桩`)
      
      // 更新连接状态
      updateConnectionStatuses()
      
    } catch (error) {
      console.error('启动心跳失败:', error)
    } finally {
      setIsInitializing(false)
    }
  }, [])

  // 启动单个充电桩心跳
  const startChargerHeartbeat = useCallback(async (chargePointId: string) => {
    try {
      await ocppWebSocketManager.connect(chargePointId)
      ocppWebSocketManager.sendStatusNotification(chargePointId, 1, 'Available')
      updateConnectionStatuses()
      return true
    } catch (error) {
      console.error(`启动充电桩 ${chargePointId} 心跳失败:`, error)
      return false
    }
  }, [])

  // 停止单个充电桩心跳
  const stopChargerHeartbeat = useCallback((chargePointId: string) => {
    ocppWebSocketManager.disconnect(chargePointId)
    updateConnectionStatuses()
  }, [])

  // 更新连接状态
  const updateConnectionStatuses = useCallback(() => {
    const statuses = ocppWebSocketManager.getAllConnectionStatus()
    setConnectionStatuses(statuses)
  }, [])

  // 定期更新连接状态
  useEffect(() => {
    const interval = setInterval(updateConnectionStatuses, 10000) // 每10秒更新一次
    return () => clearInterval(interval)
  }, [updateConnectionStatuses])

  return {
    connectionStatuses,
    isInitializing,
    startAllHeartbeats,
    startChargerHeartbeat,
    stopChargerHeartbeat,
    updateConnectionStatuses
  }
}
````

---

## 6. HTTP接口集成

### 6.1 API客户端

````typescript path=lib/api/client.ts mode=EDIT
import { ApiResponse } from "@/types/api"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1'

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error(`API请求失败: ${endpoint}`, error)
      throw error
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.baseUrl)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }
    
    return this.request<T>(url.pathname + url.search)
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient()
````

### 6.2 Station API

````typescript path=lib/api/stations.ts mode=EDIT
import { apiClient } from "./client"
import { ChargingStation, ChargePoint } from "@/types/charging"
import { ApiResponse, PageResponse, CommandResponse } from "@/types/api"

// 分页查询充电站列表
export async function getStations(params: {
  page?: number
  size?: number
}): Promise<ApiResponse<PageResponse<ChargingStation>>> {
  return apiClient.get('/stations', params)
}

// 搜索附近充电站
export async function getNearbyStations(params: {
  latitude: number
  longitude: number
  radius?: number
}): Promise<ApiResponse<ChargingStation[]>> {
  return apiClient.get('/stations/nearby', params)
}

// 查询充电站详情
export async function getStationDetail(stationId: string): Promise<ApiResponse<ChargingStation>> {
  return apiClient.get(`/stations/${stationId}`)
}

// 查询充电站下的所有充电桩
export async function getStationChargePoints(stationId: string): Promise<ApiResponse<ChargePoint[]>> {
  return apiClient.get(`/stations/${stationId}/charge-points`)
}

// 查询充电站下可用的充电桩
export async function getAvailableChargePoints(stationId: string): Promise<ApiResponse<ChargePoint[]>> {
  return apiClient.get(`/stations/${stationId}/charge-points/available`)
}

// 查询单个充电桩详情
export async function getChargePointDetail(chargePointId: string): Promise<ApiResponse<ChargePoint>> {
  return apiClient.get(`/charge-points/${chargePointId}`)
}

// 查询所有可用充电桩
export async function getAllAvailableChargePoints(): Promise<ApiResponse<ChargePoint[]>> {
  return apiClient.get('/charge-points/available')
}

// 启动充电
export async function startCharging(chargePointId: string, data: {
  connectorId: number
  idTag: string
}): Promise<ApiResponse<CommandResponse>> {
  return apiClient.post(`/charge-points/${chargePointId}/commands/start-charging`, data)
}

// 停止充电
export async function stopCharging(chargePointId: string, data: {
  transactionId: number
}): Promise<ApiResponse<CommandResponse>> {
  return apiClient.post(`/charge-points/${chargePointId}/commands/stop-charging`, data)
}

// 软重置充电桩
export async function softResetChargePoint(chargePointId: string): Promise<ApiResponse<CommandResponse>> {
  return apiClient.post(`/charge-points/${chargePointId}/commands/soft-reset`)
}

// 硬重置充电桩
export async function hardResetChargePoint(chargePointId: string): Promise<ApiResponse<CommandResponse>> {
  return apiClient.post(`/charge-points/${chargePointId}/commands/hard-reset`)
}

// 更新充电桩心跳
export async function updateChargePointHeartbeat(chargePointId: string): Promise<ApiResponse<ChargePoint>> {
  return apiClient.post(`/charge-points/${chargePointId}/heartbeat`)
}

// 更新充电桩状态
export async function updateChargePointStatus(chargePointId: string, status: string): Promise<ApiResponse<ChargePoint>> {
  return apiClient.put(`/charge-points/${chargePointId}/status`, null, { status })
}
````

---

## 7. 状态管理设计

### 7.1 充电会话管理

````typescript path=lib/store/chargingStore.ts mode=EDIT
import { create } from 'zustand'
import { ChargingSession, ChargePoint } from '@/types/charging'
import { ocppWebSocketManager } from '@/lib/websocket/OCPPWebSocketManager'

interface ChargingState {
  // 当前充电会话
  currentSession: ChargingSession | null
  // 充电桩状态缓存
  chargePointStatuses: Map<string, ChargePoint>
  // 充电数据
  chargingData: {
    power: number
    voltage: number
    current: number
    energy: number
  }
  
  // Actions
  startChargingSession: (session: ChargingSession) => void
  updateChargingData: (data: any) => void
  endChargingSession: () => void
  updateChargePointStatus: (chargePointId: string, status: ChargePoint) => void
}

export const useChargingStore = create<ChargingState>((set, get) => ({
  currentSession: null,
  chargePointStatuses: new Map(),
  chargingData: {
    power: 0,
    voltage: 0,
    current: 0,
    energy: 0
  },

  startChargingSession: (session) => {
    set({ currentSession: session })
    
    // 开始模拟充电数据
    const interval = setInterval(() => {
      const current = get().currentSession
      if (!current || current.status === 'completed') {
        clearInterval(interval)
        return
      }

      // 模拟充电数据变化
      const newData = {
        power: 7000 + Math.random() * 1000, // 7-8kW
        voltage: 220 + Math.random() * 10,  // 220-230V
        current: 32 + Math.random() * 4,    // 32-36A
        energy: get().chargingData.energy + 0.1 // 每秒增加0.1kWh
      }
      
      set({ chargingData: newData })
      
      // 发送电表数据到网关
      if (current.transactionId) {
        ocppWebSocketManager.sendMeterValues(
          current.chargePointId,
          current.connectorId,
          current.transactionId,
          [
            {
              value: newData.energy.toFixed(2),
              measurand: "Energy.Active.Import.Register",
              unit: "kWh"
            },
            {
              value: newData.power.toFixed(0),
              measurand: "Power.Active.Import",
              unit: "W"
            },
            {
              value: newData.voltage.toFixed(1),
              measurand: "Voltage",
              phase: "L1",
              unit: "V"
            },
            {
              value: newData.current.toFixed(1),
              measurand: "Current.Import",
              phase: "L1",
              unit: "A"
            }
          ]
        )
      }
    }, 1000) // 每秒更新一次
  },

  updateChargingData: (data) => {
    set({ chargingData: { ...get().chargingData, ...data } })
  },

  endChargingSession: () => {
    set({ 
      currentSession: null,
      chargingData: {
        power: 0,
        voltage: 0,
        current: 0,
        energy: 0
      }
    })
  },

  updateChargePointStatus: (chargePointId, status) => {
    const statuses = new Map(get().chargePointStatuses)
    statuses.set(chargePointId, status)
    set({ chargePointStatuses: statuses })
  }
}))
````

---

## 8. 开发计划

### 8.1 开发阶段

**第一阶段：基础架构搭建（1-2天）**
- [ ] 完善TypeScript类型定义
- [ ] 实现API客户端和Station API集成
- [ ] 搭建WebSocket通信管理器
- [ ] 实现心跳管理功能

**第二阶段：页面开发（2-3天）**
- [ ] 完善首页充电站列表（增加枪统计信息）
- [ ] 开发充电站详情页
- [ ] 开发充电枪选择页面
- [ ] 开发插枪提示页面

**第三阶段：充电流程实现（2-3天）**
- [ ] 实现插枪操作和WebSocket通信
- [ ] 实现启动充电流程
- [ ] 开发充电过程页面（实时数据显示）
- [ ] 实现停止充电流程

**第四阶段：状态管理和优化（1-2天）**
- [ ] 完善状态管理系统
- [ ] 实现充电数据模拟和实时更新
- [ ] 添加错误处理和重连机制
- [ ] 性能优化和用户体验改进

**第五阶段：开发者功能（1天）**
- [ ] 开发设置页面
- [ ] 实现手动控制充电枪在线/离线功能
- [ ] 添加连接状态监控界面
- [ ] 完善调试和日志功能

### 8.2 技术要点

1. **WebSocket连接管理**
   - 自动重连机制
   - 连接状态监控
   - 消息队列处理

2. **OCPP协议实现**
   - 严格按照OCPP1.6规范
   - 消息ID管理
   - 错误处理机制

3. **状态同步**
   - 前端状态与后端状态保持一致
   - 实时数据更新
   - 离线状态处理

4. **用户体验**
   - 加载状态提示
   - 错误信息展示
   - 操作反馈

### 8.3 测试计划

- **单元测试**: WebSocket管理器、API客户端
- **集成测试**: 完整充电流程测试
- **端到端测试**: 用户操作流程验证
- **性能测试**: 多连接并发测试

---

**文档版本**: v1.0.0  
**创建日期**: 2025-01-27  
**维护团队**: 前端开发团队
