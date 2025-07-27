# EV Charging Simulator

一个基于 Next.js 的电动汽车充电站模拟器应用，实现了完整的充电流程和 OCPP 1.6 协议通信。

## 功能特性

### 🔋 核心功能
- **充电站管理**: 浏览充电站列表，查看详细信息
- **充电桩控制**: 选择充电桩和连接器，模拟充电过程
- **实时数据**: 实时显示充电功率、电压、电流、温度等数据
- **状态管理**: 完整的充电会话状态管理和数据持久化

### 🌐 通信协议
- **OCPP 1.6**: 完整实现 OCPP 1.6 WebSocket 通信协议
- **心跳管理**: 自动心跳检测和连接状态监控
- **消息队列**: 离线消息队列和自动重发机制
- **错误处理**: 完善的错误处理和重连机制

### 🎨 用户界面
- **响应式设计**: 适配移动端和桌面端
- **现代化UI**: 基于 Tailwind CSS 的现代化界面
- **实时反馈**: Toast 通知和加载状态指示
- **开发者工具**: 充电桩在线/离线控制面板

## 技术栈

- **前端框架**: Next.js 15.2.4 (React 19)
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **UI组件**: Radix UI + shadcn/ui
- **通信**: WebSocket (OCPP 1.6)
- **类型安全**: TypeScript
- **图标**: Lucide React

## 项目结构

```
├── app/                          # Next.js App Router 页面
│   ├── page.tsx                 # 首页 - 充电站列表
│   ├── stations/[stationId]/    # 充电站详情页
│   │   ├── page.tsx            # 充电站详情
│   │   └── chargers/[chargerId]/ # 充电桩相关页面
│   │       ├── page.tsx        # 充电桩详情（连接器选择）
│   │       ├── connect/        # 插枪页面
│   │       └── charging/       # 充电过程页面
│   └── settings/               # 开发者设置页面
├── components/                  # 可复用组件
│   ├── ui/                     # 基础UI组件
│   └── StationCard.tsx         # 充电站卡片组件
├── hooks/                      # 自定义 Hooks
│   └── useHeartbeatManager.ts  # 心跳管理 Hook
├── lib/                        # 核心库文件
│   ├── api/                    # API 客户端
│   │   ├── client.ts          # 统一 API 客户端
│   │   └── stations.ts        # 充电站 API
│   ├── store/                  # 状态管理
│   │   └── chargingStore.ts   # 充电状态管理
│   └── websocket/              # WebSocket 管理
│       └── OCPPWebSocketManager.ts # OCPP WebSocket 管理器
└── types/                      # TypeScript 类型定义
    ├── charging.ts             # 充电相关类型
    ├── api.ts                  # API 相关类型
    └── websocket.ts            # WebSocket 相关类型
```

## 开发进度

### ✅ 已完成阶段

#### 第一阶段：基础架构搭建
- [x] TypeScript 类型定义完善
- [x] API 客户端实现
- [x] WebSocket 通信管理器
- [x] 必要依赖包安装

#### 第二阶段：页面开发
- [x] 首页充电站列表（集成真实API数据）
- [x] 充电站详情页面
- [x] 充电桩选择和插枪页面
- [x] 充电过程页面

#### 第三阶段：充电流程实现
- [x] 插枪操作和WebSocket通信
- [x] 启动充电流程
- [x] 充电数据实时更新
- [x] 停止充电流程

#### 第四阶段：状态管理和优化
- [x] 心跳管理功能
- [x] 全局状态管理系统
- [x] 错误处理和重连机制

### 🚧 当前阶段

#### 第五阶段：开发者功能
- [x] 设置页面开发
- [ ] 手动控制充电桩在线/离线功能
- [ ] 调试信息显示
- [ ] 性能监控面板

## 快速开始

### 环境要求
- Node.js 18+ 
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 环境配置
复制 `.env.local` 文件并配置相关参数：
```bash
# Station API配置
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1

# WebSocket网关配置  
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080/ocpp

# 调试模式
NEXT_PUBLIC_DEBUG_MODE=true
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 使用说明

### 基本流程
1. **浏览充电站**: 在首页查看可用的充电站列表
2. **选择充电站**: 点击充电站卡片进入详情页
3. **选择充电桩**: 在充电站详情页选择可用的充电桩
4. **选择连接器**: 选择合适的连接器类型（AC/DC）
5. **模拟插枪**: 点击连接按钮模拟插枪操作
6. **开始充电**: 在充电页面点击开始充电
7. **监控过程**: 实时查看充电数据和进度
8. **结束充电**: 点击停止充电按钮结束会话

### 开发者功能
- 访问 `/settings` 页面可以手动控制充电桩的在线/离线状态
- 查看连接统计和调试信息
- 批量操作充电桩连接状态

## API 接口

应用需要后端提供以下 API 接口：

### 充电站管理
- `GET /api/v1/stations` - 获取充电站列表
- `GET /api/v1/stations/{stationId}` - 获取充电站详情
- `GET /api/v1/stations/{stationId}/charge-points` - 获取充电桩列表

### 充电桩管理  
- `GET /api/v1/charge-points/{chargePointId}` - 获取充电桩详情
- `POST /api/v1/charge-points/{chargePointId}/commands/start-charging` - 启动充电
- `POST /api/v1/charge-points/{chargePointId}/commands/stop-charging` - 停止充电

### WebSocket 网关
- `ws://localhost:8080/ocpp/{chargePointId}` - OCPP 1.6 WebSocket 连接

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。
