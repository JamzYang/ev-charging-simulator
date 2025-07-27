// OCPP消息类型定义
export type OCPPMessageType = 2 | 3 | 4 // Call, CallResult, CallError

// OCPP消息格式
export type OCPPMessage = 
  | [2, string, string, any] // Call: [messageType, messageId, action, payload]
  | [3, string, any]         // CallResult: [messageType, messageId, payload]
  | [4, string, string, string, any] // CallError: [messageType, messageId, errorCode, errorDescription, errorDetails]

// OCPP动作类型
export type OCPPAction = 
  | 'BootNotification'
  | 'Heartbeat'
  | 'StatusNotification'
  | 'StartTransaction'
  | 'StopTransaction'
  | 'MeterValues'
  | 'Authorize'
  | 'DataTransfer'
  | 'RemoteStartTransaction'
  | 'RemoteStopTransaction'
  | 'Reset'
  | 'UnlockConnector'
  | 'GetConfiguration'
  | 'ChangeConfiguration'
  | 'ClearCache'
  | 'ChangeAvailability'
  | 'GetDiagnostics'
  | 'UpdateFirmware'

// WebSocket连接状态
export enum WebSocketState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3
}

// WebSocket事件类型
export interface WebSocketEvents {
  onOpen: (event: Event) => void
  onMessage: (message: OCPPMessage) => void
  onError: (error: Event) => void
  onClose: (event: CloseEvent) => void
}

// OCPP消息载荷类型
export interface BootNotificationRequest {
  chargePointVendor: string
  chargePointModel: string
  chargePointSerialNumber?: string
  chargeBoxSerialNumber?: string
  firmwareVersion?: string
  iccid?: string
  imsi?: string
  meterType?: string
  meterSerialNumber?: string
}

export interface BootNotificationResponse {
  status: 'Accepted' | 'Pending' | 'Rejected'
  currentTime: string
  interval: number
}

export interface HeartbeatRequest {}

export interface HeartbeatResponse {
  currentTime: string
}

export interface StatusNotificationRequest {
  connectorId: number
  errorCode: string
  status: string
  info?: string
  timestamp?: string
  vendorId?: string
  vendorErrorCode?: string
}

export interface StatusNotificationResponse {}

export interface StartTransactionRequest {
  connectorId: number
  idTag: string
  meterStart: number
  reservationId?: number
  timestamp: string
}

export interface StartTransactionResponse {
  transactionId: number
  idTagInfo: IdTagInfo
}

export interface StopTransactionRequest {
  meterStop: number
  timestamp: string
  transactionId: number
  reason?: string
  idTag?: string
  transactionData?: MeterValue[]
}

export interface StopTransactionResponse {
  idTagInfo?: IdTagInfo
}

export interface MeterValuesRequest {
  connectorId: number
  transactionId?: number
  meterValue: MeterValue[]
}

export interface MeterValuesResponse {}

export interface MeterValue {
  timestamp: string
  sampledValue: SampledValue[]
}

export interface SampledValue {
  value: string
  context?: 'Interruption.Begin' | 'Interruption.End' | 'Sample.Clock' | 'Sample.Periodic' | 'Transaction.Begin' | 'Transaction.End' | 'Trigger' | 'Other'
  format?: 'Raw' | 'SignedData'
  measurand?: string
  phase?: 'L1' | 'L2' | 'L3' | 'N' | 'L1-N' | 'L2-N' | 'L3-N' | 'L1-L2' | 'L2-L3' | 'L3-L1'
  location?: 'Cable' | 'EV' | 'Inlet' | 'Outlet' | 'Body'
  unit?: string
}

export interface IdTagInfo {
  status: 'Accepted' | 'Blocked' | 'Expired' | 'Invalid' | 'ConcurrentTx'
  expiryDate?: string
  parentIdTag?: string
}

export interface RemoteStartTransactionRequest {
  connectorId?: number
  idTag: string
  chargingProfile?: any
}

export interface RemoteStartTransactionResponse {
  status: 'Accepted' | 'Rejected'
}

export interface RemoteStopTransactionRequest {
  transactionId: number
}

export interface RemoteStopTransactionResponse {
  status: 'Accepted' | 'Rejected'
}

// WebSocket管理器配置
export interface WebSocketManagerConfig {
  baseUrl: string
  protocols?: string[]
  heartbeatInterval: number
  reconnectInterval: number
  maxReconnectAttempts: number
  timeout: number
}

// 连接管理器状态
export interface ConnectionManagerState {
  connections: Map<string, WebSocket>
  connectionStates: Map<string, WebSocketState>
  heartbeatIntervals: Map<string, NodeJS.Timeout>
  messageHandlers: Map<string, (message: OCPPMessage) => void>
  reconnectAttempts: Map<string, number>
}
