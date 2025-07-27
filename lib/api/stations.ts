import { apiClient } from "./client"
import { ChargingStation, ChargePoint } from "@/types/charging"
import { 
  ApiResponse, 
  PageResponse, 
  CommandResponse, 
  PaginationParams,
  LocationParams,
  StationQueryParams,
  StartChargingParams,
  StopChargingParams
} from "@/types/api"

// 分页查询充电站列表
export async function getStations(params: StationQueryParams = {}): Promise<ApiResponse<PageResponse<ChargingStation>>> {
  const queryParams = {
    page: params.page || 0,
    size: params.size || 20,
    sort: params.sort || 'createdAt',
    direction: params.direction || 'DESC',
    ...params
  }
  return apiClient.get('/stations/list', queryParams)
}

// 搜索附近充电站
export async function getNearbyStations(params: LocationParams): Promise<ApiResponse<ChargingStation[]>> {
  const queryParams = {
    latitude: params.latitude,
    longitude: params.longitude,
    radius: params.radius || 5000, // 默认5公里
  }
  return apiClient.get('/stations/nearby', queryParams)
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

// 查询所有充电桩（用于心跳管理）
export async function getAllChargePoints(params: PaginationParams = {}): Promise<ApiResponse<PageResponse<ChargePoint>>> {
  const queryParams = {
    page: params.page || 0,
    size: params.size || 100, // 获取更多数据用于心跳管理
    sort: params.sort || 'chargePointId',
    direction: params.direction || 'ASC',
  }
  return apiClient.get('/charge-points', queryParams)
}

// 启动充电
export async function startCharging(
  chargePointId: string, 
  params: StartChargingParams
): Promise<ApiResponse<CommandResponse>> {
  return apiClient.post(`/charge-points/${chargePointId}/commands/start-charging`, params)
}

// 停止充电
export async function stopCharging(
  chargePointId: string, 
  params: StopChargingParams
): Promise<ApiResponse<CommandResponse>> {
  return apiClient.post(`/charge-points/${chargePointId}/commands/stop-charging`, params)
}

// 软重置充电桩
export async function softResetChargePoint(chargePointId: string): Promise<ApiResponse<CommandResponse>> {
  return apiClient.post(`/charge-points/${chargePointId}/commands/soft-reset`)
}

// 硬重置充电桩
export async function hardResetChargePoint(chargePointId: string): Promise<ApiResponse<CommandResponse>> {
  return apiClient.post(`/charge-points/${chargePointId}/commands/hard-reset`)
}

// 解锁连接器
export async function unlockConnector(
  chargePointId: string, 
  connectorId: number
): Promise<ApiResponse<CommandResponse>> {
  return apiClient.post(`/charge-points/${chargePointId}/commands/unlock-connector`, {
    connectorId
  })
}

// 更改充电桩可用性
export async function changeAvailability(
  chargePointId: string,
  connectorId: number,
  type: 'Inoperative' | 'Operative'
): Promise<ApiResponse<CommandResponse>> {
  return apiClient.post(`/charge-points/${chargePointId}/commands/change-availability`, {
    connectorId,
    type
  })
}

// 获取充电桩配置
export async function getChargePointConfiguration(
  chargePointId: string,
  keys?: string[]
): Promise<ApiResponse<CommandResponse>> {
  return apiClient.post(`/charge-points/${chargePointId}/commands/get-configuration`, {
    key: keys
  })
}

// 更改充电桩配置
export async function changeChargePointConfiguration(
  chargePointId: string,
  key: string,
  value: string
): Promise<ApiResponse<CommandResponse>> {
  return apiClient.post(`/charge-points/${chargePointId}/commands/change-configuration`, {
    key,
    value
  })
}

// 清除缓存
export async function clearCache(chargePointId: string): Promise<ApiResponse<CommandResponse>> {
  return apiClient.post(`/charge-points/${chargePointId}/commands/clear-cache`)
}

// 获取诊断信息
export async function getDiagnostics(
  chargePointId: string,
  location: string,
  retries?: number,
  retryInterval?: number,
  startTime?: string,
  stopTime?: string
): Promise<ApiResponse<CommandResponse>> {
  return apiClient.post(`/charge-points/${chargePointId}/commands/get-diagnostics`, {
    location,
    retries,
    retryInterval,
    startTime,
    stopTime
  })
}

// 更新固件
export async function updateFirmware(
  chargePointId: string,
  location: string,
  retrieveDate: string,
  retries?: number,
  retryInterval?: number
): Promise<ApiResponse<CommandResponse>> {
  return apiClient.post(`/charge-points/${chargePointId}/commands/update-firmware`, {
    location,
    retrieveDate,
    retries,
    retryInterval
  })
}

// 数据传输
export async function dataTransfer(
  chargePointId: string,
  vendorId: string,
  messageId?: string,
  data?: string
): Promise<ApiResponse<CommandResponse>> {
  return apiClient.post(`/charge-points/${chargePointId}/commands/data-transfer`, {
    vendorId,
    messageId,
    data
  })
}

// 更新充电桩心跳
export async function updateChargePointHeartbeat(chargePointId: string): Promise<ApiResponse<ChargePoint>> {
  return apiClient.post(`/charge-points/${chargePointId}/heartbeat`)
}

// 更新充电桩状态
export async function updateChargePointStatus(
  chargePointId: string, 
  status: string
): Promise<ApiResponse<ChargePoint>> {
  return apiClient.put(`/charge-points/${chargePointId}/status`, { status })
}

// 批量获取充电桩状态
export async function getChargePointsStatus(chargePointIds: string[]): Promise<ApiResponse<ChargePoint[]>> {
  return apiClient.post('/charge-points/status/batch', { chargePointIds })
}

// 获取充电桩实时数据
export async function getChargePointRealTimeData(chargePointId: string): Promise<ApiResponse<any>> {
  return apiClient.get(`/charge-points/${chargePointId}/real-time-data`)
}

// 获取充电历史记录
export async function getChargingHistory(
  chargePointId?: string,
  params: PaginationParams & {
    startTime?: string
    endTime?: string
    idTag?: string
  } = {}
): Promise<ApiResponse<PageResponse<any>>> {
  const endpoint = chargePointId 
    ? `/charge-points/${chargePointId}/charging-history`
    : '/charging-history'
  
  return apiClient.get(endpoint, params)
}
