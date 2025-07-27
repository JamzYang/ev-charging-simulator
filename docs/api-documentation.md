# 充电App HTTP接口文档

## 目录

- [充电App HTTP接口文档](#充电app-http接口文档)
  - [目录](#目录)
  - [1. 基础信息](#1-基础信息)
    - [1.1 服务概述](#11-服务概述)
    - [1.2 统一响应格式](#12-统一响应格式)
  - [2. 电站管理接口](#2-电站管理接口)
    - [2.1 分页查询充电站列表](#21-分页查询充电站列表)
    - [2.2 搜索附近充电站](#22-搜索附近充电站)
    - [2.3 查询充电站详情](#23-查询充电站详情)
  - [3. 充电桩管理接口](#3-充电桩管理接口)
    - [3.1 查询充电站下的所有充电桩](#31-查询充电站下的所有充电桩)
    - [3.2 查询充电站下可用的充电桩](#32-查询充电站下可用的充电桩)
    - [3.3 查询单个充电桩详情](#33-查询单个充电桩详情)
    - [3.4 查询所有可用充电桩](#34-查询所有可用充电桩)
  - [4. 设备控制接口](#4-设备控制接口)
    - [4.1 启动充电](#41-启动充电)
    - [4.2 停止充电](#42-停止充电)
    - [4.3 软重置充电桩](#43-软重置充电桩)
    - [4.4 硬重置充电桩](#44-硬重置充电桩)
  - [5. 实时状态接口](#5-实时状态接口)
    - [5.1 更新充电桩心跳](#51-更新充电桩心跳)
    - [5.2 更新充电桩状态](#52-更新充电桩状态)
  - [6. 错误处理](#6-错误处理)
    - [6.1 错误码定义](#61-错误码定义)
    - [6.2 错误响应示例](#62-错误响应示例)
  - [7. 数据字典](#7-数据字典)
    - [7.1 充电站状态枚举 (StationStatus)](#71-充电站状态枚举-stationstatus)
    - [7.2 设备状态枚举 (DeviceStatus)](#72-设备状态枚举-devicestatus)
    - [7.3 连接器类型枚举 (ConnectorType)](#73-连接器类型枚举-connectortype)
  - [8. 环境配置](#8-环境配置)
    - [8.1 开发环境](#81-开发环境)
    - [8.2 测试环境](#82-测试环境)
  - [9. 注意事项](#9-注意事项)
    - [9.1 异步操作说明](#91-异步操作说明)
    - [9.2 状态实时性](#92-状态实时性)
    - [9.3 地理查询优化](#93-地理查询优化)
    - [9.4 缓存策略](#94-缓存策略)
    - [9.5 认证授权](#95-认证授权)
    - [9.6 限流和监控](#96-限流和监控)
    - [9.7 数据格式说明](#97-数据格式说明)

---

## 1. 基础信息

### 1.1 服务概述

**服务名称**: 充电站域服务 (Charge Station Service)  
**基础URL**: `http://localhost:8080/api/v1`  
**API版本**: v1  
**响应格式**: JSON  
**字符编码**: UTF-8

### 1.2 统一响应格式

所有接口都使用统一的响应格式：

```json
{
  "success": true,
  "message": "操作成功",
  "data": {}, 
  "errorCode": null,
  "timestamp": "2025-07-27T10:30:00.000Z"
}
```

**字段说明**:
- `success`: 操作是否成功
- `message`: 响应消息
- `data`: 响应数据
- `errorCode`: 错误代码（成功时为null）
- `timestamp`: 响应时间戳

---

## 2. 电站管理接口

### 2.1 分页查询充电站列表

**请求方法**: `GET`
**URL**: `/api/v1/stations`

**请求参数**:
| 参数名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | int | 否 | 0 | 页码，从0开始 |
| size | int | 否 | 20 | 每页大小 |

**请求示例**:
```
GET /api/v1/stations?page=0&size=10
```

**响应数据结构**:
```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    "content": [
      {
        "stationId": "ST001",
        "name": "万达广场充电站",
        "address": "北京市朝阳区建国路93号",
        "description": "位于万达广场地下停车场",
        "latitude": 39.904200,
        "longitude": 116.407400,
        "operatorId": "OP001",
        "status": "ACTIVE",
        "statusDescription": "正常运营",
        "openTime": "00:00",
        "closeTime": "23:59",
        "businessHoursFormatted": "全天营业",
        "canProvideService": true,
        "createdAt": "2025-07-27T10:30:00.000Z",
        "updatedAt": "2025-07-27T10:30:00.000Z"
      }
    ],
    "page": 0,
    "size": 10,
    "totalElements": 50,
    "totalPages": 5,
    "first": true,
    "last": false,
    "hasNext": true,
    "hasPrevious": false
  },
  "timestamp": "2025-07-27T10:30:00.000Z"
}
```

### 2.2 搜索附近充电站

**请求方法**: `GET`
**URL**: `/api/v1/stations/nearby`

**请求参数**:
| 参数名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| latitude | double | 是 | - | 纬度 |
| longitude | double | 是 | - | 经度 |
| radius | double | 否 | 5000 | 搜索半径（米） |

**请求示例**:
```
GET /api/v1/stations/nearby?latitude=39.904200&longitude=116.407400&radius=3000
```

**响应数据结构**:
```json
{
  "success": true,
  "message": "操作成功",
  "data": [
    {
      "stationId": "ST001",
      "name": "万达广场充电站",
      "address": "北京市朝阳区建国路93号",
      "description": null,
      "latitude": 39.904200,
      "longitude": 116.407400,
      "operatorId": null,
      "status": "ACTIVE",
      "statusDescription": "正常运营",
      "openTime": null,
      "closeTime": null,
      "businessHoursFormatted": null,
      "canProvideService": true,
      "createdAt": null,
      "updatedAt": null
    }
  ],
  "timestamp": "2025-07-27T10:30:00.000Z"
}
```

### 2.3 查询充电站详情

**请求方法**: `GET`  
**URL**: `/api/v1/stations/{stationId}`  

**路径参数**:
| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| stationId | string | 是 | 充电站ID |

**请求示例**:
```
GET /api/v1/stations/ST001
```

**响应数据结构**:
```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    "stationId": "ST001",
    "name": "万达广场充电站",
    "address": "北京市朝阳区建国路93号",
    "description": "位于万达广场地下停车场B2层",
    "latitude": 39.904200,
    "longitude": 116.407400,
    "operatorId": "OP001",
    "status": "ACTIVE",
    "statusDescription": "正常运营",
    "openTime": "00:00",
    "closeTime": "23:59",
    "businessHoursFormatted": "全天营业",
    "canProvideService": true,
    "createdAt": "2025-07-27T10:30:00.000Z",
    "updatedAt": "2025-07-27T10:30:00.000Z"
  },
  "timestamp": "2025-07-27T10:30:00.000Z"
}
```

---

## 3. 充电桩管理接口

### 3.1 查询充电站下的所有充电桩

**请求方法**: `GET`  
**URL**: `/api/v1/stations/{stationId}/charge-points`  

**路径参数**:
| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| stationId | string | 是 | 充电站ID |

**请求示例**:
```
GET /api/v1/stations/ST001/charge-points
```

**响应数据结构**:
```json
{
  "success": true,
  "message": "操作成功",
  "data": [
    {
      "chargePointId": "CP001",
      "stationId": "ST001", 
      "name": "1号充电桩",
      "model": "AC7KW",
      "vendor": "特来电",
      "serialNumber": "TLD001",
      "firmwareVersion": "1.0.0",
      "status": "Available",
      "statusDescription": "可用",
      "lastHeartbeat": "2025-07-27T10:29:00.000Z",
      "maxPower": 7.00,
      "maxPowerFormatted": "7.00kW",
      "isOnline": true,
      "isAvailableForCharging": true,
      "hasAvailableConnector": true,
      "availableConnectorCount": 1,
      "connectors": [
        {
          "connectorId": 1,
          "connectorType": "GB_AC",
          "connectorTypeDescription": "国标交流慢充",
          "status": "Available",
          "statusDescription": "可用",
          "maxPower": 7.00,
          "maxPowerFormatted": "7.00kW",
          "isAvailableForCharging": true,
          "isCharging": false,
          "isOffline": false,
          "isFastCharging": false,
          "isSuperCharging": false,
          "displayName": "1号枪(国标交流慢充-7.00kW)",
          "createdAt": "2025-07-27T10:30:00.000Z",
          "updatedAt": "2025-07-27T10:30:00.000Z"
        }
      ],
      "createdAt": "2025-07-27T10:30:00.000Z",
      "updatedAt": "2025-07-27T10:30:00.000Z"
    }
  ],
  "timestamp": "2025-07-27T10:30:00.000Z"
}
```

### 3.2 查询充电站下可用的充电桩

**请求方法**: `GET`
**URL**: `/api/v1/stations/{stationId}/charge-points/available`

**路径参数**:
| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| stationId | string | 是 | 充电站ID |

**请求示例**:
```
GET /api/v1/stations/ST001/charge-points/available
```

**响应数据结构**: 同3.1，但只返回状态为可用的充电桩

### 3.3 查询单个充电桩详情

**请求方法**: `GET`
**URL**: `/api/v1/charge-points/{chargePointId}`

**路径参数**:
| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| chargePointId | string | 是 | 充电桩ID |

**请求示例**:
```
GET /api/v1/charge-points/CP001
```

**响应数据结构**: 返回单个充电桩的详细信息（格式同3.1）

### 3.4 查询所有可用充电桩

**请求方法**: `GET`
**URL**: `/api/v1/charge-points/available`

**请求示例**:
```
GET /api/v1/charge-points/available
```

**响应数据结构**: 返回所有可用充电桩列表（格式同3.1）

---

## 4. 设备控制接口

### 4.1 启动充电

**请求方法**: `POST`
**URL**: `/api/v1/charge-points/{chargePointId}/commands/start-charging`

**路径参数**:
| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| chargePointId | string | 是 | 充电桩ID |

**请求体**:
```json
{
  "connectorId": 1,
  "idTag": "USER123456"
}
```

**请求体字段说明**:
| 字段名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| connectorId | int | 是 | 连接器ID（1-10） |
| idTag | string | 是 | 用户标识（最大20字符） |

**请求示例**:
```
POST /api/v1/charge-points/CP001/commands/start-charging
Content-Type: application/json

{
  "connectorId": 1,
  "idTag": "USER123456"
}
```

**响应格式** (HTTP 202 Accepted):
```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    "commandId": "CMD-UUID-12345",
    "status": "ACCEPTED",
    "message": "指令已接受，正在处理中"
  },
  "timestamp": "2025-07-27T10:30:00.000Z"
}
```

### 4.2 停止充电

**请求方法**: `POST`
**URL**: `/api/v1/charge-points/{chargePointId}/commands/stop-charging`

**路径参数**:
| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| chargePointId | string | 是 | 充电桩ID |

**请求体**:
```json
{
  "transactionId": 12345
}
```

**请求体字段说明**:
| 字段名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| transactionId | int | 是 | 交易ID |

**请求示例**:
```
POST /api/v1/charge-points/CP001/commands/stop-charging
Content-Type: application/json

{
  "transactionId": 12345
}
```

**响应格式** (HTTP 202 Accepted):
```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    "commandId": "CMD-UUID-67890",
    "status": "ACCEPTED",
    "message": "指令已接受，正在处理中"
  },
  "timestamp": "2025-07-27T10:30:00.000Z"
}
```

### 4.3 软重置充电桩

**请求方法**: `POST`
**URL**: `/api/v1/charge-points/{chargePointId}/commands/soft-reset`

**路径参数**:
| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| chargePointId | string | 是 | 充电桩ID |

**请求示例**:
```
POST /api/v1/charge-points/CP001/commands/soft-reset
```

**响应格式** (HTTP 202 Accepted):
```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    "commandId": "CMD-UUID-RESET1",
    "status": "ACCEPTED",
    "message": "指令已接受，正在处理中"
  },
  "timestamp": "2025-07-27T10:30:00.000Z"
}
```

### 4.4 硬重置充电桩

**请求方法**: `POST`
**URL**: `/api/v1/charge-points/{chargePointId}/commands/hard-reset`

**路径参数**:
| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| chargePointId | string | 是 | 充电桩ID |

**请求示例**:
```
POST /api/v1/charge-points/CP001/commands/hard-reset
```

**响应格式** (HTTP 202 Accepted):
```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    "commandId": "CMD-UUID-RESET2",
    "status": "ACCEPTED",
    "message": "指令已接受，正在处理中"
  },
  "timestamp": "2025-07-27T10:30:00.000Z"
}
```

---

## 5. 实时状态接口

### 5.1 更新充电桩心跳

**请求方法**: `POST`
**URL**: `/api/v1/charge-points/{chargePointId}/heartbeat`

**路径参数**:
| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| chargePointId | string | 是 | 充电桩ID |

**请求示例**:
```
POST /api/v1/charge-points/CP001/heartbeat
```

**响应格式**:
```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    "chargePointId": "CP001",
    "stationId": "ST001",
    "name": "1号充电桩",
    "model": null,
    "vendor": null,
    "serialNumber": null,
    "firmwareVersion": null,
    "status": "Available",
    "statusDescription": "可用",
    "lastHeartbeat": "2025-07-27T10:30:00.000Z",
    "maxPower": null,
    "maxPowerFormatted": null,
    "isOnline": true,
    "isAvailableForCharging": true,
    "hasAvailableConnector": true,
    "availableConnectorCount": 1,
    "connectors": null,
    "createdAt": null,
    "updatedAt": null
  },
  "timestamp": "2025-07-27T10:30:00.000Z"
}
```

### 5.2 更新充电桩状态

**请求方法**: `PUT`
**URL**: `/api/v1/charge-points/{chargePointId}/status`

**路径参数**:
| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| chargePointId | string | 是 | 充电桩ID |

**请求参数**:
| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| status | string | 是 | 新状态（见数据字典） |

**请求示例**:
```
PUT /api/v1/charge-points/CP001/status?status=Available
```

**响应格式**:
```json
{
  "success": true,
  "message": "充电桩状态更新成功",
  "data": {
    "chargePointId": "CP001",
    "stationId": "ST001",
    "name": "1号充电桩",
    "model": "AC7KW",
    "vendor": "特来电",
    "serialNumber": "TLD001",
    "firmwareVersion": "1.0.0",
    "status": "Available",
    "statusDescription": "可用",
    "lastHeartbeat": "2025-07-27T10:29:00.000Z",
    "maxPower": 7.00,
    "maxPowerFormatted": "7.00kW",
    "isOnline": true,
    "isAvailableForCharging": true,
    "hasAvailableConnector": true,
    "availableConnectorCount": 1,
    "connectors": [
      {
        "connectorId": 1,
        "connectorType": "GB_AC",
        "connectorTypeDescription": "国标交流慢充",
        "status": "Available",
        "statusDescription": "可用",
        "maxPower": 7.00,
        "maxPowerFormatted": "7.00kW",
        "isAvailableForCharging": true,
        "isCharging": false,
        "isOffline": false,
        "isFastCharging": false,
        "isSuperCharging": false,
        "displayName": "1号枪(国标交流慢充-7.00kW)",
        "createdAt": "2025-07-27T10:30:00.000Z",
        "updatedAt": "2025-07-27T10:30:00.000Z"
      }
    ],
    "createdAt": "2025-07-27T10:30:00.000Z",
    "updatedAt": "2025-07-27T10:30:00.000Z"
  },
  "timestamp": "2025-07-27T10:30:00.000Z"
}
```

---

## 6. 错误处理

### 6.1 错误码定义

| 错误码 | HTTP状态码 | 错误类型 | 描述 | 示例消息 |
|--------|------------|----------|------|----------|
| 40001-40099 | 400 | 业务异常 | 业务规则违反 | "充电站名称已存在" |
| 40404 | 404 | 资源不存在 | 请求的资源不存在 | "充电站不存在" |
| 40901-40999 | 409 | 资源冲突 | 资源状态冲突 | "充电桩正在使用中" |
| 50001-50099 | 500 | 系统异常 | 系统内部错误 | "系统暂时不可用" |

### 6.2 错误响应示例

**业务异常响应**:
```json
{
  "success": false,
  "message": "充电桩当前不可用",
  "data": null,
  "errorCode": "40001",
  "timestamp": "2025-07-27T10:30:00.000Z"
}
```

**资源不存在响应**:
```json
{
  "success": false,
  "message": "充电桩不存在",
  "data": null,
  "errorCode": "40404",
  "timestamp": "2025-07-27T10:30:00.000Z"
}
```

**参数校验失败响应**:
```json
{
  "success": false,
  "message": "纬度必须在-90到90之间",
  "data": null,
  "errorCode": "40001",
  "timestamp": "2025-07-27T10:30:00.000Z"
}
```

---

## 7. 数据字典

### 7.1 充电站状态枚举 (StationStatus)

| 状态码 | 状态名称 | 描述 |
|--------|----------|------|
| ACTIVE | 正常运营 | 充电站正常运营，可提供服务 |
| INACTIVE | 暂停运营 | 充电站暂停运营，不可提供服务 |
| MAINTENANCE | 维护中 | 充电站正在维护，暂时不可用 |

### 7.2 设备状态枚举 (DeviceStatus)

| 状态码 | 状态名称 | 描述 | 可充电 |
|--------|----------|------|--------|
| Available | 可用 | 充电桩可用，可以开始充电 | ✅ |
| Preparing | 准备中 | 充电桩正在准备充电 | ✅ |
| Charging | 充电中 | 充电桩正在充电 | ❌ |
| SuspendedEVSE | 设备暂停 | 充电桩暂停（设备端） | ❌ |
| SuspendedEV | 车辆暂停 | 充电桩暂停（车辆端） | ❌ |
| Finishing | 结束中 | 充电即将结束 | ❌ |
| Reserved | 已预约 | 充电桩已被预约 | ❌ |
| Unavailable | 不可用 | 充电桩不可用 | ❌ |
| Faulted | 故障 | 充电桩故障 | ❌ |
| Offline | 离线 | 充电桩离线（内部状态） | ❌ |

### 7.3 连接器类型枚举 (ConnectorType)

| 类型码 | 类型名称 | 描述 | 是否快充 |
|--------|----------|------|----------|
| GB_DC | 国标直流快充 | 中国国标直流充电接口 | ✅ |
| GB_AC | 国标交流慢充 | 中国国标交流充电接口 | ❌ |
| TYPE2 | 欧标Type2 | 欧洲标准Type2接口 | ❌ |
| CCS1 | 美标CCS1 | 美国标准CCS1接口 | ✅ |
| CCS2 | 欧标CCS2 | 欧洲标准CCS2接口 | ✅ |
| CHADEMO | 日标CHAdeMO | 日本标准CHAdeMO接口 | ✅ |
| TESLA | 特斯拉专用 | 特斯拉专用充电接口 | ✅ |

---

## 8. 环境配置

### 8.1 开发环境

**服务配置**:
- **服务地址**: `http://localhost:8080/api/v1`
- **服务端口**: 8080
- **上下文路径**: `/api/v1`

**依赖服务**:
- **数据库**: PostgreSQL (localhost:5432/charge_station)
- **缓存**: Redis (localhost:6379)
- **消息队列**: Kafka (localhost:9092)

**API文档**:
- **Swagger UI**: `http://localhost:8080/swagger-ui.html`

### 8.2 测试环境

**服务配置**:
- **服务地址**: `http://test-env:8080/api/v1`
- **数据库**: PostgreSQL (test-db:5432/charge_station_test)
- **缓存**: Redis (test-redis:6379)
- **消息队列**: Kafka (test-kafka:9092)

---

## 9. 注意事项

### 9.1 异步操作说明
- **启动充电**和**停止充电**是异步操作，接口立即返回指令接受状态
- 实际执行结果通过事件机制异步通知，需要通过状态查询接口获取最新状态
- 重置操作也是异步的，执行结果需要通过心跳或状态查询确认

### 9.2 状态实时性
- 充电桩状态通过心跳机制保持实时更新（默认5分钟超时）
- 状态变更通过事件驱动机制实时同步
- 建议客户端定期查询状态以确保数据一致性

### 9.3 地理查询优化
- 附近充电站查询使用PostGIS进行高效的地理空间计算
- 搜索半径建议不超过50公里，以保证查询性能
- 返回结果按距离排序，距离单位为米

### 9.4 缓存策略
- **充电站详情**: 缓存30分钟，适合相对稳定的基础信息
- **充电桩状态**: 缓存1分钟，保证状态的实时性
- **附近充电站**: 缓存5分钟，平衡性能和实时性

### 9.5 认证授权
- 当前版本为开发环境，未启用认证机制
- 生产环境需要添加JWT或OAuth2认证
- 建议对设备控制接口进行权限控制

### 9.6 限流和监控
- 建议对高频接口（如状态查询）进行限流
- 关键业务指标通过Prometheus监控
- 健康检查端点：`/actuator/health`

### 9.7 数据格式说明
- 所有时间字段使用ISO 8601格式（UTC时区）
- 地理坐标使用WGS84坐标系
- 功率单位统一使用千瓦（kW）
- 距离单位统一使用米（m）

---

**文档版本**: v1.0
**最后更新**: 2025-07-27
**维护团队**: 架构师团队
