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

// API错误类型
export interface ApiError {
  code: string
  message: string
  details?: any
  timestamp: string
}

// 请求参数类型
export interface PaginationParams {
  page?: number
  size?: number
  sort?: string
  direction?: 'ASC' | 'DESC'
}

export interface LocationParams {
  latitude: number
  longitude: number
  radius?: number
}

export interface StationQueryParams extends PaginationParams {
  name?: string
  status?: string
  operatorId?: string
}

// 充电控制命令参数
export interface StartChargingParams {
  connectorId: number
  idTag: string
  chargingProfile?: ChargingProfile
}

export interface StopChargingParams {
  transactionId: number
  reason?: string
}

export interface ChargingProfile {
  chargingProfileId: number
  stackLevel: number
  chargingProfilePurpose: 'ChargePointMaxProfile' | 'TxDefaultProfile' | 'TxProfile'
  chargingProfileKind: 'Absolute' | 'Recurring' | 'Relative'
  recurrencyKind?: 'Daily' | 'Weekly'
  validFrom?: string
  validTo?: string
  chargingSchedule: ChargingSchedule
}

export interface ChargingSchedule {
  duration?: number
  startSchedule?: string
  chargingRateUnit: 'W' | 'A'
  chargingSchedulePeriod: ChargingSchedulePeriod[]
  minChargingRate?: number
}

export interface ChargingSchedulePeriod {
  startPeriod: number
  limit: number
  numberPhases?: number
}

// HTTP状态码
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503
}

// API端点常量
export const API_ENDPOINTS = {
  STATIONS: '/stations',
  CHARGE_POINTS: '/charge-points',
  COMMANDS: '/commands',
  HEARTBEAT: '/heartbeat',
  STATUS: '/status'
} as const
