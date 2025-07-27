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

// 充电数据类型
export interface ChargingData {
  power: number
  voltage: number
  current: number
  energy: number
  temperature?: number
  soc?: number // 电池电量百分比
}

// 电表数据类型
export interface MeterValue {
  value: string
  measurand: string
  phase?: string
  unit: string
  location?: string
  context?: string
}

// 充电统计信息
export interface ChargingStats {
  totalConnectors: number
  availableConnectors: number
  chargingConnectors: number
  faultedConnectors: number
  acConnectors: number
  dcConnectors: number
}
