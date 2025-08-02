import {
  OCPPMessage,
  OCPPAction,
  WebSocketState,
  WebSocketManagerConfig,
  ConnectionManagerState,
  BootNotificationRequest,
  HeartbeatRequest,
  StatusNotificationRequest,
  StartTransactionRequest,
  StopTransactionRequest,
  MeterValuesRequest,
  RemoteStartTransactionResponse,
  RemoteStopTransactionResponse
} from "@/types/websocket"
import { ConnectionStatus } from "@/types/charging"

export class OCPPWebSocketManager {
  private config: WebSocketManagerConfig
  private state: ConnectionManagerState
  private messageQueue: Map<string, OCPPMessage[]> = new Map()
  private pendingMessages: Map<string, { resolve: Function, reject: Function, timeout: NodeJS.Timeout }> = new Map()
  private errorHandlers: Map<string, (error: Error) => void> = new Map()
  private networkStatus: 'online' | 'offline' = 'online'

  constructor(config?: Partial<WebSocketManagerConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080/ocpp',
      protocols: config?.protocols || ['ocpp1.6'],
      heartbeatInterval: config?.heartbeatInterval || 300000, // 5分钟
      reconnectInterval: config?.reconnectInterval || 5000, // 5秒
      maxReconnectAttempts: config?.maxReconnectAttempts || 5,
      timeout: config?.timeout || 30000, // 30秒
      disconnectTimeout: config?.disconnectTimeout || 10000, // 断开连接超时时间
    }

    this.state = {
      connections: new Map(),
      connectionStates: new Map(),
      heartbeatIntervals: new Map(),
      messageHandlers: new Map(),
      reconnectAttempts: new Map(),
      connectionLocks: new Map(), // 添加连接操作互斥锁
    }

    // 监听网络状态变化
    this.setupNetworkMonitoring()
  }

  // 设置网络状态监控
  private setupNetworkMonitoring() {
    if (typeof window !== 'undefined') {
      // 监听在线/离线状态
      window.addEventListener('online', () => {
        console.log('网络已连接，尝试重连所有充电桩')
        this.networkStatus = 'online'
        this.handleNetworkReconnect()
      })

      window.addEventListener('offline', () => {
        console.log('网络已断开')
        this.networkStatus = 'offline'
        this.handleNetworkDisconnect()
      })

      // 初始网络状态
      this.networkStatus = navigator.onLine ? 'online' : 'offline'
    }
  }

  // 处理网络重连
  private async handleNetworkReconnect() {
    // 等待一段时间确保网络稳定
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 尝试重连所有之前连接的充电桩
    const chargePointIds = Array.from(this.state.connectionStates.keys())
    for (const chargePointId of chargePointIds) {
      if (this.state.connectionStates.get(chargePointId) === WebSocketState.CLOSED) {
        console.log(`网络恢复，重连充电桩: ${chargePointId}`)
        this.connect(chargePointId).catch(error => {
          console.error(`网络恢复后重连失败: ${chargePointId}`, error)
        })
      }
    }
  }

  // 处理网络断开
  private handleNetworkDisconnect() {
    // 标记所有连接为离线状态
    for (const [chargePointId] of this.state.connections) {
      this.state.connectionStates.set(chargePointId, WebSocketState.CLOSED)
      this.notifyError(chargePointId, new Error('网络连接已断开'))
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
      // 检查网络状态
      if (this.networkStatus === 'offline') {
        throw new Error('网络连接不可用')
      }

      const currentState = this.state.connectionStates.get(chargePointId) || WebSocketState.CLOSED

      // 检查当前状态是否允许连接
      if (currentState === WebSocketState.CONNECTING) {
        throw new Error(`充电桩 ${chargePointId} 正在连接中`)
      }

      if (currentState === WebSocketState.OPEN) {
        console.log(`充电桩 ${chargePointId} 已连接，先断开旧连接`)
        await this._doDisconnect(chargePointId)
      }

      if (currentState === WebSocketState.CLOSING) {
        console.log(`充电桩 ${chargePointId} 正在断开中，等待完成...`)
        await this._waitForState(chargePointId, WebSocketState.CLOSED, this.config.disconnectTimeout)
      }

      // 设置连接状态
      this.state.connectionStates.set(chargePointId, WebSocketState.CONNECTING)

      const url = `${this.config.baseUrl}/${chargePointId}`
      console.log(`尝试连接充电桩: ${chargePointId} -> ${url}`)

      const ws = new WebSocket(url, this.config.protocols)

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close()
          this.state.connectionStates.set(chargePointId, WebSocketState.CLOSED)
          const error = new Error(`连接超时: ${chargePointId} (${this.config.timeout}ms)`)
          this.notifyError(chargePointId, error)
          reject(error)
        }, this.config.timeout)

        ws.onopen = () => {
          clearTimeout(timeout)
          console.log(`充电桩 ${chargePointId} 连接成功`)

          this.state.connections.set(chargePointId, ws)
          this.state.connectionStates.set(chargePointId, WebSocketState.OPEN)
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
          this.state.connectionStates.set(chargePointId, WebSocketState.CLOSED)

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
      this.state.connectionStates.set(chargePointId, WebSocketState.CLOSED)
      this.notifyError(chargePointId, error as Error)
      return false
    }
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

  // 错误通知
  private notifyError(chargePointId: string, error: Error) {
    const handler = this.errorHandlers.get(chargePointId)
    if (handler) {
      handler(error)
    }
  }

  // 注册错误处理器
  onError(chargePointId: string, handler: (error: Error) => void) {
    this.errorHandlers.set(chargePointId, handler)
  }

  // 移除错误处理器
  offError(chargePointId: string) {
    this.errorHandlers.delete(chargePointId)
  }

  // 尝试重连
  private async attemptReconnect(chargePointId: string) {
    // 检查网络状态
    if (this.networkStatus === 'offline') {
      console.log(`网络离线，跳过重连: ${chargePointId}`)
      return
    }

    const attempts = this.state.reconnectAttempts.get(chargePointId) || 0

    if (attempts < this.config.maxReconnectAttempts) {
      this.state.reconnectAttempts.set(chargePointId, attempts + 1)

      const delay = this.config.reconnectInterval * Math.pow(2, attempts) // 指数退避
      console.log(`尝试重连充电桩 ${chargePointId}, 第 ${attempts + 1} 次，延迟 ${delay}ms`)

      setTimeout(async () => {
        try {
          // 再次检查网络状态
          if (this.networkStatus === 'offline') {
            console.log(`网络仍然离线，取消重连: ${chargePointId}`)
            return
          }

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

    if (!ws || currentState !== WebSocketState.OPEN) {
      console.log(`充电桩 ${chargePointId} 未连接，跳过断开操作`)
      this.cleanup(chargePointId)
      return
    }

    this.state.connectionStates.set(chargePointId, WebSocketState.CLOSING)

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

  // 清理资源
  private cleanup(chargePointId: string) {
    this.state.connections.delete(chargePointId)
    this.state.connectionStates.set(chargePointId, WebSocketState.CLOSED)

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

  // 发送消息
  private sendMessage(chargePointId: string, message: OCPPMessage): Promise<any> {
    const ws = this.state.connections.get(chargePointId)

    // 检查网络状态
    if (this.networkStatus === 'offline') {
      const error = new Error(`网络离线，无法发送消息到 ${chargePointId}`)
      this.notifyError(chargePointId, error)
      return Promise.reject(error)
    }

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

        // 检查WebSocket状态
        if (ws.readyState !== WebSocket.OPEN) {
          const error = new Error(`WebSocket连接已关闭: ${chargePointId}`)
          this.notifyError(chargePointId, error)
          reject(error)
          return
        }

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
    const response: RemoteStartTransactionResponse = { status: 'Accepted' }
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
    const response: RemoteStopTransactionResponse = { status: 'Accepted' }
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
    const request: BootNotificationRequest = {
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
    const request: HeartbeatRequest = {}
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
    const request: StatusNotificationRequest = {
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
    const request: StartTransactionRequest = {
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
    const request: MeterValuesRequest = {
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
    const request: StopTransactionRequest = {
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

  // 获取连接状态
  getConnectionStatus(chargePointId: string): ConnectionStatus {
    const ws = this.state.connections.get(chargePointId)
    const state = this.state.connectionStates.get(chargePointId) || WebSocketState.CLOSED

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
