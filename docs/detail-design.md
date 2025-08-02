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

### 5.1 连接生命周期管理

#### 5.1.1 连接状态机设计

```
连接状态转换图:
IDLE ──connect()──> CONNECTING ──onopen──> CONNECTED
  ↑                     │                      │
  │                     │onerror              │
  │                     ▼                      │
  └──cleanup()──── DISCONNECTING ◄──disconnect()──┘
                        │
                        │onclose
                        ▼
                      IDLE
```

#### 5.1.2 连接状态枚举

````typescript
enum WebSocketState {
  IDLE = 'IDLE',           // 空闲状态，可以建立新连接
  CONNECTING = 'CONNECTING', // 正在建立连接
  CONNECTED = 'CONNECTED',   // 已连接
  DISCONNECTING = 'DISCONNECTING' // 正在断开连接
}
````

#### 5.1.3 连接管理原则

1. **连接唯一性**: 每个充电桩同时只能有一个WebSocket连接
2. **状态一致性**: 客户端和服务端连接状态必须保持一致
3. **优雅断开**: 断开连接时必须等待服务端确认
4. **重连安全**: 重连前必须确保旧连接完全清理
5. **并发控制**: 同一充电桩的连接操作必须串行化

### 5.2 WebSocket管理器重新设计

````typescript path=lib/websocket/OCPPWebSocketManager.ts mode=EDIT
import { OCPPMessage, ConnectionStatus } from "@/types/charging"

// 连接状态枚举
enum WebSocketState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTING = 'DISCONNECTING'
}

// 连接管理配置
interface WebSocketManagerConfig {
  baseUrl: string
  protocols: string[]
  heartbeatInterval: number
  reconnectInterval: number
  maxReconnectAttempts: number
  timeout: number
  disconnectTimeout: number  // 断开连接超时时间
}

// 连接管理状态
interface ConnectionManagerState {
  connections: Map<string, WebSocket>
  connectionStates: Map<string, WebSocketState>
  heartbeatIntervals: Map<string, NodeJS.Timeout>
  messageHandlers: Map<string, (message: OCPPMessage) => void>
  reconnectAttempts: Map<string, number>
  connectionLocks: Map<string, Promise<boolean>>  // 连接操作互斥锁
}

export class OCPPWebSocketManager {
  private config: WebSocketManagerConfig
  private state: ConnectionManagerState
  private messageQueue: Map<string, OCPPMessage[]> = new Map()
  private pendingMessages: Map<string, { resolve: Function, reject: Function, timeout: NodeJS.Timeout }> = new Map()
  private errorHandlers: Map<string, (error: Error) => void> = new Map()

  constructor(config?: Partial<WebSocketManagerConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || 'ws://localhost:8080/ocpp',
      protocols: config?.protocols || ['ocpp1.6'],
      heartbeatInterval: config?.heartbeatInterval || 300000,
      reconnectInterval: config?.reconnectInterval || 5000,
      maxReconnectAttempts: config?.maxReconnectAttempts || 5,
      timeout: config?.timeout || 30000,
      disconnectTimeout: config?.disconnectTimeout || 10000,
      ...config
    }

    this.state = {
      connections: new Map(),
      connectionStates: new Map(),
      heartbeatIntervals: new Map(),
      messageHandlers: new Map(),
      reconnectAttempts: new Map(),
      connectionLocks: new Map()
    }
  }

  // 连接充电桩（带互斥锁）
  async connect(chargePointId: string): Promise<boolean> {
    // 检查是否已有连接操作在进行
    const existingLock = this.state.connectionLocks.get(chargePointId)
    if (existingLock) {
      console.log(`充电桩 ${chargePointId} 连接操作已在进行中，等待完成...`)
      return existingLock
    }

    // 创建连接操作锁
    const connectionPromise = this._doConnect(chargePointId)
    this.state.connectionLocks.set(chargePointId, connectionPromise)

    try {
      const result = await connectionPromise
      return result
    } finally {
      // 清理连接锁
      this.state.connectionLocks.delete(chargePointId)
    }
  }

  // 实际连接实现
  private async _doConnect(chargePointId: string): Promise<boolean> {
    try {
      const currentState = this.state.connectionStates.get(chargePointId) || WebSocketState.IDLE

      // 检查当前状态是否允许连接
      if (currentState === WebSocketState.CONNECTING) {
        throw new Error(`充电桩 ${chargePointId} 正在连接中`)
      }

      if (currentState === WebSocketState.CONNECTED) {
        console.log(`充电桩 ${chargePointId} 已连接，先断开旧连接`)
        await this._doDisconnect(chargePointId)
      }

      if (currentState === WebSocketState.DISCONNECTING) {
        console.log(`充电桩 ${chargePointId} 正在断开中，等待完成...`)
        await this._waitForState(chargePointId, WebSocketState.IDLE, this.config.disconnectTimeout)
      }

      // 设置连接状态
      this.state.connectionStates.set(chargePointId, WebSocketState.CONNECTING)

      const url = `${this.config.baseUrl}/${chargePointId}`
      console.log(`尝试连接充电桩: ${chargePointId} -> ${url}`)

      const ws = new WebSocket(url, this.config.protocols)

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close()
          this.state.connectionStates.set(chargePointId, WebSocketState.IDLE)
          const error = new Error(`连接超时: ${chargePointId} (${this.config.timeout}ms)`)
          this.notifyError(chargePointId, error)
          reject(error)
        }, this.config.timeout)

        ws.onopen = () => {
          clearTimeout(timeout)
          console.log(`充电桩 ${chargePointId} 连接成功`)

          this.state.connections.set(chargePointId, ws)
          this.state.connectionStates.set(chargePointId, WebSocketState.CONNECTED)
          this.state.reconnectAttempts.set(chargePointId, 0)

          this.setupEventHandlers(chargePointId, ws)
          this.startHeartbeat(chargePointId)

          // 发送启动通知
          this.sendBootNotification(chargePointId).catch(error => {
            console.error(`发送启动通知失败: ${chargePointId}`, error)
          })

          // 发送队列中的消息
          this.flushMessageQueue(chargePointId)

          resolve(true)
        }

        ws.onerror = (error) => {
          clearTimeout(timeout)
          const errorMsg = `充电桩 ${chargePointId} 连接错误`
          console.error(errorMsg, error)
          this.state.connectionStates.set(chargePointId, WebSocketState.IDLE)

          const connectionError = new Error(errorMsg)
          this.notifyError(chargePointId, connectionError)
          reject(connectionError)
        }

        ws.onclose = (event) => {
          clearTimeout(timeout)
          console.log(`充电桩 ${chargePointId} 连接关闭: code=${event.code}, reason=${event.reason}`)
          this.handleConnectionClose(chargePointId, event)
        }
      })
    } catch (error) {
      console.error(`连接充电桩 ${chargePointId} 失败:`, error)
      this.state.connectionStates.set(chargePointId, WebSocketState.IDLE)
      this.notifyError(chargePointId, error as Error)
      return false
    }
  }

  // 断开连接（优雅断开）
  async disconnect(chargePointId: string): Promise<void> {
    // 检查是否已有连接操作在进行
    const existingLock = this.state.connectionLocks.get(chargePointId)
    if (existingLock) {
      console.log(`充电桩 ${chargePointId} 连接操作进行中，等待完成后断开...`)
      await existingLock.catch(() => {}) // 忽略连接失败
    }

    return this._doDisconnect(chargePointId)
  }

  // 实际断开实现
  private async _doDisconnect(chargePointId: string): Promise<void> {
    const ws = this.state.connections.get(chargePointId)
    const currentState = this.state.connectionStates.get(chargePointId)

    if (!ws || currentState !== WebSocketState.CONNECTED) {
      console.log(`充电桩 ${chargePointId} 未连接，跳过断开操作`)
      this.cleanup(chargePointId)
      return
    }

    this.state.connectionStates.set(chargePointId, WebSocketState.DISCONNECTING)

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn(`充电桩 ${chargePointId} 断开超时，强制清理`)
        this.cleanup(chargePointId)
        resolve()
      }, this.config.disconnectTimeout)

      const originalOnClose = ws.onclose
      ws.onclose = (event) => {
        clearTimeout(timeout)
        console.log(`充电桩 ${chargePointId} 断开完成`)
        this.cleanup(chargePointId)
        resolve()

        // 调用原始的onclose处理器（如果存在）
        if (originalOnClose && typeof originalOnClose === 'function') {
          originalOnClose.call(ws, event)
        }
      }

      ws.close(1000, 'Normal closure')
    })
  }

  // 等待连接状态变化
  private async _waitForState(chargePointId: string, targetState: WebSocketState, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()

      const checkState = () => {
        const currentState = this.state.connectionStates.get(chargePointId)

        if (currentState === targetState) {
          resolve()
          return
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`等待状态 ${targetState} 超时: ${chargePointId}`))
          return
        }

        setTimeout(checkState, 100) // 每100ms检查一次
      }

      checkState()
    })
  }

  // 设置事件处理器
  private setupEventHandlers(chargePointId: string, ws: WebSocket) {
    ws.onmessage = (event) => {
      try {
        const message: OCPPMessage = JSON.parse(event.data)
        this.handleMessage(chargePointId, message)
      } catch (error) {
        console.error(`解析消息失败 ${chargePointId}:`, error, event.data)
      }
    }
  }

  // 处理连接关闭
  private handleConnectionClose(chargePointId: string, event: CloseEvent) {
    this.cleanup(chargePointId)

    // 如果不是主动关闭，尝试重连
    if (event.code !== 1000) { // 1000 = 正常关闭
      this.attemptReconnect(chargePointId)
    }
  }

  // 清理资源
  private cleanup(chargePointId: string) {
    this.state.connections.delete(chargePointId)
    this.state.connectionStates.set(chargePointId, WebSocketState.IDLE)

    const interval = this.state.heartbeatIntervals.get(chargePointId)
    if (interval) {
      clearInterval(interval)
      this.state.heartbeatIntervals.delete(chargePointId)
    }

    this.state.messageHandlers.delete(chargePointId)

    // 清理待处理的消息
    for (const [messageId, pending] of this.pendingMessages.entries()) {
      if (messageId.startsWith(chargePointId)) {
        clearTimeout(pending.timeout)
        pending.reject(new Error('连接已断开'))
        this.pendingMessages.delete(messageId)
      }
    }
  }

  // 错误通知
  private notifyError(chargePointId: string, error: Error) {
    const handler = this.errorHandlers.get(chargePointId)
    if (handler) {
      handler(error)
    }
  }

  // 尝试重连
  private async attemptReconnect(chargePointId: string) {
    const attempts = this.state.reconnectAttempts.get(chargePointId) || 0

    if (attempts < this.config.maxReconnectAttempts) {
      this.state.reconnectAttempts.set(chargePointId, attempts + 1)

      const delay = this.config.reconnectInterval * Math.pow(2, attempts) // 指数退避
      console.log(`尝试重连充电桩 ${chargePointId}, 第 ${attempts + 1} 次，延迟 ${delay}ms`)

      setTimeout(async () => {
        try {
          await this.connect(chargePointId)
          console.log(`充电桩 ${chargePointId} 重连成功`)
        } catch (error) {
          console.error(`重连失败 ${chargePointId}:`, error)
          this.notifyError(chargePointId, error as Error)
        }
      }, delay)
    } else {
      const error = new Error(`充电桩 ${chargePointId} 重连次数已达上限 (${this.config.maxReconnectAttempts})`)
      console.error(error.message)
      this.notifyError(chargePointId, error)
    }
  }

  // 消息队列管理
  private queueMessage(chargePointId: string, message: OCPPMessage) {
    if (!this.messageQueue.has(chargePointId)) {
      this.messageQueue.set(chargePointId, [])
    }
    this.messageQueue.get(chargePointId)!.push(message)
  }

  private flushMessageQueue(chargePointId: string) {
    const queue = this.messageQueue.get(chargePointId)
    if (queue && queue.length > 0) {
      console.log(`发送队列中的 ${queue.length} 条消息: ${chargePointId}`)
      queue.forEach(message => {
        this.sendMessage(chargePointId, message).catch(console.error)
      })
      this.messageQueue.delete(chargePointId)
    }
  }

  // 发送消息（带重试和队列）
  private sendMessage(chargePointId: string, message: OCPPMessage): Promise<any> {
    const ws = this.state.connections.get(chargePointId)

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // 如果连接不可用，将消息加入队列
      this.queueMessage(chargePointId, message)
      const error = new Error(`充电桩 ${chargePointId} 连接不可用，消息已加入队列`)
      console.warn(error.message)
      return Promise.reject(error)
    }

    return new Promise((resolve, reject) => {
      try {
        const messageData = JSON.stringify(message)
        ws.send(messageData)
        console.log(`发送消息到 ${chargePointId}:`, message[0] === 2 ? `${message[2]} (${message[1]})` : `Response (${message[1]})`)

        // 如果是Call消息，等待响应
        if (message[0] === 2) {
          const messageId = message[1]
          const timeout = setTimeout(() => {
            this.pendingMessages.delete(`${chargePointId}-${messageId}`)
            const error = new Error(`消息超时: ${chargePointId} - ${message[2]} (${this.config.timeout}ms)`)
            this.notifyError(chargePointId, error)
            reject(error)
          }, this.config.timeout)

          this.pendingMessages.set(`${chargePointId}-${messageId}`, {
            resolve,
            reject,
            timeout
          })
        } else {
          resolve(undefined)
        }
      } catch (error) {
        const sendError = new Error(`发送消息失败: ${chargePointId} - ${(error as Error).message}`)
        this.notifyError(chargePointId, sendError)
        reject(sendError)
      }
    })
  }

  // 处理接收到的消息
  private handleMessage(chargePointId: string, message: OCPPMessage) {
    const [messageType, messageId, actionOrPayload, payload] = message

    if (messageType === 2) { // Call
      this.handleCall(chargePointId, messageId, actionOrPayload as string, payload)
    } else if (messageType === 3) { // CallResult
      this.handleCallResult(chargePointId, messageId, actionOrPayload)
    } else if (messageType === 4) { // CallError
      this.handleCallError(chargePointId, messageId, actionOrPayload as string, payload)
    }

    // 通知外部处理器
    const handler = this.state.messageHandlers.get(chargePointId)
    if (handler) {
      handler(message)
    }
  }

  // 处理Call消息
  private handleCall(chargePointId: string, messageId: string, action: string, payload: any) {
    console.log(`收到 ${chargePointId} 的 ${action} 请求:`, payload)

    switch (action) {
      case 'RemoteStartTransaction':
        this.handleRemoteStartTransaction(chargePointId, messageId, payload)
        break

      case 'RemoteStopTransaction':
        this.handleRemoteStopTransaction(chargePointId, messageId, payload)
        break

      default:
        this.sendCallResult(chargePointId, messageId, {})
    }
  }

  // 处理远程启动充电
  private handleRemoteStartTransaction(chargePointId: string, messageId: string, payload: any) {
    const response = { status: 'Accepted' }
    this.sendCallResult(chargePointId, messageId, response)

    // 模拟启动充电流程
    setTimeout(() => {
      this.sendStatusNotification(chargePointId, payload.connectorId || 1, 'Preparing')
      setTimeout(() => {
        this.sendStartTransaction(chargePointId, payload.connectorId || 1, payload.idTag)
      }, 2000)
    }, 1000)
  }

  // 处理远程停止充电
  private handleRemoteStopTransaction(chargePointId: string, messageId: string, payload: any) {
    const response = { status: 'Accepted' }
    this.sendCallResult(chargePointId, messageId, response)

    // 模拟停止充电流程
    setTimeout(() => {
      this.sendStopTransaction(chargePointId, payload.transactionId, 1500)
      this.sendStatusNotification(chargePointId, 1, 'Available')
    }, 1000)
  }

  // 发送CallResult响应
  private sendCallResult(chargePointId: string, messageId: string, payload: any) {
    const message: OCPPMessage = [3, messageId, payload]
    this.sendMessage(chargePointId, message).catch(console.error)
  }

  // 处理CallResult消息
  private handleCallResult(chargePointId: string, messageId: string, payload: any) {
    const pendingKey = `${chargePointId}-${messageId}`
    const pending = this.pendingMessages.get(pendingKey)

    if (pending) {
      clearTimeout(pending.timeout)
      pending.resolve(payload)
      this.pendingMessages.delete(pendingKey)
    }
  }

  // 处理CallError消息
  private handleCallError(chargePointId: string, messageId: string, errorCode: string, errorDescription: string) {
    console.error(`收到 ${chargePointId} 的错误:`, errorCode, errorDescription)

    const pendingKey = `${chargePointId}-${messageId}`
    const pending = this.pendingMessages.get(pendingKey)

    if (pending) {
      clearTimeout(pending.timeout)
      pending.reject(new Error(`${errorCode}: ${errorDescription}`))
      this.pendingMessages.delete(pendingKey)
    }
  }

  // 生成消息ID
  private generateMessageId(): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    return `sim-${timestamp}-${random}`
  }

  // OCPP消息发送方法

  // 发送启动通知
  sendBootNotification(chargePointId: string): Promise<any> {
    const request = {
      chargePointVendor: "SimulatorVendor",
      chargePointModel: "SimulatorModel",
      chargePointSerialNumber: chargePointId,
      firmwareVersion: "1.0.0"
    }

    const message: OCPPMessage = [2, this.generateMessageId(), "BootNotification", request]
    return this.sendMessage(chargePointId, message)
  }

  // 发送心跳
  sendHeartbeat(chargePointId: string): Promise<any> {
    const request = {}
    const message: OCPPMessage = [2, this.generateMessageId(), "Heartbeat", request]
    return this.sendMessage(chargePointId, message)
  }

  // 发送状态通知
  sendStatusNotification(
    chargePointId: string,
    connectorId: number,
    status: string,
    errorCode: string = "NoError"
  ): Promise<any> {
    const request = {
      connectorId,
      errorCode,
      status,
      timestamp: new Date().toISOString(),
      info: `Connector ${connectorId} status: ${status}`
    }

    const message: OCPPMessage = [2, this.generateMessageId(), "StatusNotification", request]
    return this.sendMessage(chargePointId, message)
  }

  // 发送开始交易
  sendStartTransaction(chargePointId: string, connectorId: number, idTag: string): Promise<any> {
    const request = {
      connectorId,
      idTag,
      meterStart: 0,
      timestamp: new Date().toISOString()
    }

    const message: OCPPMessage = [2, this.generateMessageId(), "StartTransaction", request]
    return this.sendMessage(chargePointId, message)
  }

  // 发送电表数据
  sendMeterValues(
    chargePointId: string,
    connectorId: number,
    transactionId: number,
    values: any[]
  ): Promise<any> {
    const request = {
      connectorId,
      transactionId,
      meterValue: [{
        timestamp: new Date().toISOString(),
        sampledValue: values
      }]
    }

    const message: OCPPMessage = [2, this.generateMessageId(), "MeterValues", request]
    return this.sendMessage(chargePointId, message)
  }

  // 发送停止交易
  sendStopTransaction(
    chargePointId: string,
    transactionId: number,
    meterStop: number,
    reason: string = "Local"
  ): Promise<any> {
    const request = {
      transactionId,
      meterStop,
      timestamp: new Date().toISOString(),
      reason
    }

    const message: OCPPMessage = [2, this.generateMessageId(), "StopTransaction", request]
    return this.sendMessage(chargePointId, message)
  }

  // 启动心跳
  private startHeartbeat(chargePointId: string) {
    const interval = setInterval(() => {
      this.sendHeartbeat(chargePointId).catch(error => {
        console.error(`心跳发送失败 ${chargePointId}:`, error)
      })
    }, this.config.heartbeatInterval)

    this.state.heartbeatIntervals.set(chargePointId, interval)
  }

  // 注册消息处理器
  onMessage(chargePointId: string, handler: (message: OCPPMessage) => void) {
    this.state.messageHandlers.set(chargePointId, handler)
  }

  // 移除消息处理器
  offMessage(chargePointId: string) {
    this.state.messageHandlers.delete(chargePointId)
  }

  // 注册错误处理器
  onError(chargePointId: string, handler: (error: Error) => void) {
    this.errorHandlers.set(chargePointId, handler)
  }

  // 移除错误处理器
  offError(chargePointId: string) {
    this.errorHandlers.delete(chargePointId)
  }

  // 获取连接状态
  getConnectionStatus(chargePointId: string): ConnectionStatus {
    const ws = this.state.connections.get(chargePointId)
    const state = this.state.connectionStates.get(chargePointId) || WebSocketState.IDLE

    return {
      chargePointId,
      connected: ws ? ws.readyState === WebSocket.OPEN : false,
      lastHeartbeat: new Date().toISOString(),
      connectionTime: new Date().toISOString()
    }
  }

  // 获取所有连接状态
  getAllConnectionStatus(): ConnectionStatus[] {
    return Array.from(this.state.connections.keys()).map(chargePointId =>
      this.getConnectionStatus(chargePointId)
    )
  }

  // 检查连接是否活跃
  isConnected(chargePointId: string): boolean {
    const ws = this.state.connections.get(chargePointId)
    return ws ? ws.readyState === WebSocket.OPEN : false
  }

  // 获取连接数量
  getConnectionCount(): number {
    return Array.from(this.state.connections.values())
      .filter(ws => ws.readyState === WebSocket.OPEN).length
  }

  // 断开所有连接
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.state.connections.keys())
      .map(chargePointId => this.disconnect(chargePointId))

    await Promise.allSettled(disconnectPromises)
  }

  // 重连所有连接
  async reconnectAll(): Promise<void> {
    const chargePointIds = Array.from(this.state.connections.keys())
    const promises = chargePointIds.map(id => this.connect(id))
    await Promise.allSettled(promises)
  }
}

// 单例实例
export const ocppWebSocketManager = new OCPPWebSocketManager()
````

### 5.3 心跳管理Hook重新设计

#### 5.3.1 批量连接策略优化

为了避免并发连接导致的重复连接问题，重新设计批量连接策略：

1. **串行连接**: 逐个建立连接，避免并发竞争
2. **连接去重**: 确保同一充电桩不会重复连接
3. **进度跟踪**: 提供详细的连接进度信息
4. **错误分类**: 区分不同类型的连接错误

````typescript path=hooks/useHeartbeatManager.ts mode=EDIT
import { useCallback, useEffect, useState } from "react"
import { ocppWebSocketManager } from "@/lib/websocket/OCPPWebSocketManager"
import { getStations, getStationChargePoints } from "@/lib/api/stations"
import { ConnectionStatus } from "@/types/charging"
import { toast } from "react-hot-toast"

export function useHeartbeatManager() {
  const [connectionStatuses, setConnectionStatuses] = useState<ConnectionStatus[]>([])
  const [isInitializing, setIsInitializing] = useState(false)
  const [initializationProgress, setInitializationProgress] = useState(0)

  // 更新连接状态
  const updateConnectionStatuses = useCallback(() => {
    const statuses = ocppWebSocketManager.getAllConnectionStatus()
    setConnectionStatuses(statuses)
  }, [])

  // 启动所有充电枪的心跳（串行连接策略）
  const startAllHeartbeats = useCallback(async () => {
    setIsInitializing(true)
    setInitializationProgress(0)

    try {
      console.log('开始初始化所有充电桩连接...')

      // 1. 获取所有充电站
      const stationsResponse = await getStations({ page: 0, size: 100 })
      const stations = stationsResponse.data.content
      console.log(`获取到 ${stations.length} 个充电站`)

      // 2. 获取所有充电桩
      const allChargePoints = []
      for (let i = 0; i < stations.length; i++) {
        const station = stations[i]
        try {
          const chargePointsResponse = await getStationChargePoints(station.stationId)
          allChargePoints.push(...chargePointsResponse.data)
          setInitializationProgress(((i + 1) / stations.length) * 30) // 前30%进度用于获取数据
        } catch (error) {
          console.error(`获取充电站 ${station.stationId} 的充电桩失败:`, error)
        }
      }

      console.log(`获取到 ${allChargePoints.length} 个充电桩`)

      // 3. 去重充电桩ID
      const uniqueChargePoints = Array.from(
        new Map(allChargePoints.map(cp => [cp.chargePointId, cp])).values()
      )

      if (uniqueChargePoints.length !== allChargePoints.length) {
        console.warn(`发现重复充电桩ID，去重后: ${uniqueChargePoints.length}/${allChargePoints.length}`)
      }

      // 4. 串行建立连接（避免并发竞争）
      let successCount = 0
      let networkErrors = 0
      let timeoutErrors = 0
      let duplicateErrors = 0
      let otherErrors = 0

      for (let i = 0; i < uniqueChargePoints.length; i++) {
        const chargePoint = uniqueChargePoints[i]

        try {
          // 设置错误处理器
          ocppWebSocketManager.onError(chargePoint.chargePointId, (error) => {
            console.error(`充电桩 ${chargePoint.chargePointId} 错误:`, error)

            // 错误分类统计
            if (error.message.includes('网络') || error.message.includes('offline')) {
              networkErrors++
            } else if (error.message.includes('超时') || error.message.includes('timeout')) {
              timeoutErrors++
            } else if (error.message.includes('already exists') || error.message.includes('重复')) {
              duplicateErrors++
            } else {
              otherErrors++
            }
          })

          // 建立连接
          await ocppWebSocketManager.connect(chargePoint.chargePointId)

          // 发送初始状态通知
          await ocppWebSocketManager.sendStatusNotification(
            chargePoint.chargePointId,
            1,
            'Available'
          )

          successCount++

          // 更新进度
          setInitializationProgress(30 + ((i + 1) / uniqueChargePoints.length) * 70)

          // 短暂延迟，避免过快的连接请求
          if (i < uniqueChargePoints.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }

        } catch (error) {
          console.error(`连接充电桩 ${chargePoint.chargePointId} 失败:`, error)

          // 错误分类
          const errorMessage = (error as Error).message
          if (errorMessage.includes('网络') || errorMessage.includes('offline')) {
            networkErrors++
          } else if (errorMessage.includes('超时') || errorMessage.includes('timeout')) {
            timeoutErrors++
          } else if (errorMessage.includes('already exists') || errorMessage.includes('重复')) {
            duplicateErrors++
          } else {
            otherErrors++
          }
        }
      }

      console.log(`连接完成: 成功 ${successCount}/${uniqueChargePoints.length}`)
      console.log(`错误统计: 网络错误 ${networkErrors}, 超时错误 ${timeoutErrors}, 重复连接 ${duplicateErrors}, 其他错误 ${otherErrors}`)

      // 显示详细的成功/失败提示
      if (successCount === uniqueChargePoints.length) {
        toast.success(`所有 ${successCount} 个充电桩连接成功`)
      } else if (successCount > 0) {
        toast.success(`成功连接 ${successCount}/${uniqueChargePoints.length} 个充电桩`)

        // 显示失败原因统计
        if (duplicateErrors > 0) {
          toast.error(`${duplicateErrors} 个充电桩重复连接被拒绝`)
        }
        if (networkErrors > 0) {
          toast.error(`${networkErrors} 个充电桩网络连接失败`)
        }
        if (timeoutErrors > 0) {
          toast.error(`${timeoutErrors} 个充电桩连接超时`)
        }
        if (otherErrors > 0) {
          toast.error(`${otherErrors} 个充电桩连接失败`)
        }
      } else {
        if (duplicateErrors === uniqueChargePoints.length) {
          toast.error('所有充电桩连接失败：重复连接被拒绝，请检查是否有其他实例在运行')
        } else if (networkErrors === uniqueChargePoints.length) {
          toast.error('所有充电桩连接失败：网络连接问题')
        } else if (timeoutErrors === uniqueChargePoints.length) {
          toast.error('所有充电桩连接失败：连接超时')
        } else {
          toast.error('所有充电桩连接失败，请检查网络和服务器状态')
        }
      }

      // 更新连接状态
      updateConnectionStatuses()

    } catch (error) {
      console.error('启动心跳失败:', error)
      toast.error('初始化充电桩连接失败')
    } finally {
      setIsInitializing(false)
      setInitializationProgress(100)
    }
  }, [updateConnectionStatuses])

  // 启动单个充电桩心跳
  const startChargerHeartbeat = useCallback(async (chargePointId: string) => {
    try {
      // 设置错误处理器
      ocppWebSocketManager.onError(chargePointId, (error) => {
        console.error(`充电桩 ${chargePointId} 错误:`, error)
        if (error.message.includes('网络')) {
          toast.error(`网络连接问题: ${chargePointId}`)
        } else if (error.message.includes('超时')) {
          toast.error(`连接超时: ${chargePointId}`)
        } else if (error.message.includes('already exists')) {
          toast.error(`${chargePointId} 重复连接被拒绝`)
        } else if (error.message.includes('重连次数已达上限')) {
          toast.error(`${chargePointId} 连接失败，请检查网络`)
        }
      })

      await ocppWebSocketManager.connect(chargePointId)
      await ocppWebSocketManager.sendStatusNotification(chargePointId, 1, 'Available')
      updateConnectionStatuses()
      toast.success(`充电桩 ${chargePointId} 已上线`)
      return true
    } catch (error) {
      console.error(`启动充电桩 ${chargePointId} 心跳失败:`, error)
      const errorMessage = (error as Error).message
      if (errorMessage.includes('网络离线')) {
        toast.error('网络连接不可用，请检查网络设置')
      } else if (errorMessage.includes('连接超时')) {
        toast.error(`充电桩 ${chargePointId} 连接超时，请稍后重试`)
      } else if (errorMessage.includes('already exists')) {
        toast.error(`充电桩 ${chargePointId} 重复连接被拒绝，请检查是否有其他实例在运行`)
      } else {
        toast.error(`充电桩 ${chargePointId} 上线失败: ${errorMessage}`)
      }
      return false
    }
  }, [updateConnectionStatuses])

  // 停止单个充电桩心跳
  const stopChargerHeartbeat = useCallback(async (chargePointId: string) => {
    try {
      // 移除错误处理器
      ocppWebSocketManager.offError(chargePointId)
      await ocppWebSocketManager.disconnect(chargePointId)
      updateConnectionStatuses()
      toast.success(`充电桩 ${chargePointId} 已离线`)
    } catch (error) {
      console.error(`停止充电桩 ${chargePointId} 心跳失败:`, error)
      toast.error(`充电桩 ${chargePointId} 离线失败: ${(error as Error).message}`)
    }
  }, [updateConnectionStatuses])

  // 批量启动充电桩
  const startMultipleChargers = useCallback(async (chargePointIds: string[]) => {
    const promises = chargePointIds.map(id => startChargerHeartbeat(id))
    const results = await Promise.allSettled(promises)

    const successCount = results.filter(result =>
      result.status === 'fulfilled' && result.value === true
    ).length

    if (successCount === chargePointIds.length) {
      toast.success(`成功启动 ${successCount} 个充电桩`)
    } else {
      toast.error(`${chargePointIds.length - successCount} 个充电桩启动失败`)
    }

    return successCount
  }, [startChargerHeartbeat])

  // 批量停止充电桩
  const stopMultipleChargers = useCallback(async (chargePointIds: string[]) => {
    const promises = chargePointIds.map(id => stopChargerHeartbeat(id))
    await Promise.allSettled(promises)
    toast.success(`已停止 ${chargePointIds.length} 个充电桩`)
  }, [stopChargerHeartbeat])

  // 停止所有充电桩
  const stopAllHeartbeats = useCallback(async () => {
    try {
      await ocppWebSocketManager.disconnectAll()
      updateConnectionStatuses()
      toast.success('所有充电桩已离线')
    } catch (error) {
      console.error('停止所有心跳失败:', error)
      toast.error('停止所有充电桩失败')
    }
  }, [updateConnectionStatuses])

  // 重连所有充电桩
  const reconnectAllHeartbeats = useCallback(async () => {
    try {
      await ocppWebSocketManager.reconnectAll()
      updateConnectionStatuses()
      toast.success('所有充电桩重连完成')
    } catch (error) {
      console.error('重连所有充电桩失败:', error)
      toast.error('重连所有充电桩失败')
    }
  }, [updateConnectionStatuses])

  // 获取连接统计信息
  const getConnectionStats = useCallback(() => {
    const total = connectionStatuses.length
    const connected = connectionStatuses.filter(status => status.connected).length
    const disconnected = total - connected

    return {
      total,
      connected,
      disconnected,
      connectionRate: total > 0 ? (connected / total) * 100 : 0
    }
  }, [connectionStatuses])

  // 检查特定充电桩是否在线
  const isChargerOnline = useCallback((chargePointId: string) => {
    return ocppWebSocketManager.isConnected(chargePointId)
  }, [])

  // 获取在线充电桩列表
  const getOnlineChargers = useCallback(() => {
    return connectionStatuses
      .filter(status => status.connected)
      .map(status => status.chargePointId)
  }, [connectionStatuses])

  // 获取离线充电桩列表
  const getOfflineChargers = useCallback(() => {
    return connectionStatuses
      .filter(status => !status.connected)
      .map(status => status.chargePointId)
  }, [connectionStatuses])

  // 定期更新连接状态
  useEffect(() => {
    const interval = setInterval(updateConnectionStatuses, 10000) // 每10秒更新一次
    return () => clearInterval(interval)
  }, [updateConnectionStatuses])

  // 监听页面可见性变化，页面重新可见时更新状态
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateConnectionStatuses()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [updateConnectionStatuses])

  return {
    // 状态
    connectionStatuses,
    isInitializing,
    initializationProgress,

    // 操作方法
    startAllHeartbeats,
    startChargerHeartbeat,
    stopChargerHeartbeat,
    startMultipleChargers,
    stopMultipleChargers,
    stopAllHeartbeats,
    reconnectAllHeartbeats,
    updateConnectionStatuses,

    // 查询方法
    getConnectionStats,
    isChargerOnline,
    getOnlineChargers,
    getOfflineChargers,
  }
}
````

---

## 6. HTTP接口集成

### 6.1 API客户端

````typescript path=lib/api/client.ts mode=EDIT
import { ApiResponse } from "@/types/api"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8083/api/v1'

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

1. **WebSocket连接生命周期管理**
   - **连接状态机**: IDLE → CONNECTING → CONNECTED → DISCONNECTING → IDLE
   - **连接互斥锁**: 防止同一充电桩的并发连接操作
   - **优雅断开**: 等待服务端确认断开后再允许新连接
   - **连接去重**: 确保同一充电桩只有一个活跃连接
   - **状态一致性**: 客户端和服务端连接状态保持同步

2. **批量连接策略优化**
   - **串行连接**: 逐个建立连接，避免并发竞争
   - **进度跟踪**: 提供详细的连接进度和错误统计
   - **错误分类**: 区分网络错误、超时错误、重复连接等
   - **连接延迟**: 连接间适当延迟，减少服务器压力

3. **重连机制改进**
   - **指数退避**: 重连间隔逐渐增加，避免频繁重试
   - **网络状态感知**: 监听网络状态变化，智能重连
   - **重连限制**: 设置最大重连次数，避免无限重试
   - **状态验证**: 重连前验证连接状态，确保清理完成

4. **OCPP协议实现**
   - **严格按照OCPP1.6规范**: 消息格式、状态转换严格遵循标准
   - **消息ID管理**: 唯一消息ID生成和响应匹配
   - **消息队列**: 连接不可用时消息入队，连接恢复后批量发送
   - **超时处理**: 消息发送超时检测和错误处理

5. **错误处理和监控**
   - **分层错误处理**: WebSocket层、OCPP层、应用层分别处理
   - **错误分类统计**: 统计不同类型错误的发生频率
   - **实时监控**: 连接状态、心跳状态、错误率实时监控
   - **用户友好提示**: 根据错误类型提供具体的解决建议

6. **状态同步和数据一致性**
   - **实时状态更新**: 连接状态、充电状态实时同步
   - **状态缓存**: 本地缓存连接状态，减少查询开销
   - **数据校验**: 关键状态变更时进行数据校验
   - **离线处理**: 网络断开时的状态保持和恢复

7. **性能优化**
   - **连接池管理**: 合理管理WebSocket连接资源
   - **内存管理**: 及时清理断开连接的相关资源
   - **事件节流**: 高频事件（如状态更新）进行节流处理
   - **批量操作**: 批量连接、批量断开等操作优化

8. **用户体验优化**
   - **加载状态**: 详细的初始化进度显示
   - **错误反馈**: 清晰的错误信息和解决建议
   - **操作确认**: 重要操作的确认和反馈
   - **状态指示**: 直观的连接状态和统计信息显示

### 8.3 测试计划

- **单元测试**: WebSocket管理器、API客户端
- **集成测试**: 完整充电流程测试
- **端到端测试**: 用户操作流程验证
- **性能测试**: 多连接并发测试

---

**文档版本**: v1.0.0  
**创建日期**: 2025-01-27  
**维护团队**: 前端开发团队
