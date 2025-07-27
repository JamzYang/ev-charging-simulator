# 🔌 EV Charging Simulator

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![OCPP](https://img.shields.io/badge/OCPP-1.6-green?style=flat-square)](https://www.openchargealliance.org/)

一个功能完整的电动汽车充电站模拟器应用，基于 Next.js 开发，实现了完整的充电流程和 OCPP 1.6 协议通信。该应用可用于充电桩开发测试、充电站管理系统演示以及 OCPP 协议学习。

## ✨ 功能特性

### 🔋 核心功能
- **充电站管理**: 浏览充电站列表，查看详细信息和实时状态
- **充电桩控制**: 选择充电桩和连接器，模拟完整充电过程
- **实时数据监控**: 实时显示充电功率、电压、电流、能耗等关键数据
- **会话管理**: 完整的充电会话状态管理和数据持久化
- **多连接器支持**: 支持 AC/DC 多种连接器类型（GB/T、Type2、CCS、CHAdeMO等）

### 🌐 通信协议
- **OCPP 1.6 完整实现**: 支持所有核心消息类型（BootNotification、Heartbeat、StatusNotification等）
- **智能心跳管理**: 自动心跳检测、连接状态监控和故障恢复
- **消息队列机制**: 离线消息队列、自动重发和消息去重
- **健壮错误处理**: 完善的错误处理、自动重连和退避策略
- **实时状态同步**: WebSocket 实时通信，状态变化即时反馈

### 🎨 用户界面
- **响应式设计**: 完美适配移动端、平板和桌面端
- **现代化UI**: 基于 Tailwind CSS 和 Radix UI 的精美界面
- **实时反馈**: Toast 通知、加载状态、进度指示器
- **开发者工具**: 充电桩在线/离线控制面板、调试信息查看
- **无障碍支持**: 符合 WCAG 标准的无障碍设计

## 🛠️ 技术栈

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **前端框架** | Next.js | 15.2.4 | React 全栈框架，支持 App Router |
| **UI 库** | React | 19 | 最新版本 React，支持并发特性 |
| **类型安全** | TypeScript | 5 | 静态类型检查，提升代码质量 |
| **样式框架** | Tailwind CSS | 3.4.17 | 原子化 CSS 框架 |
| **UI 组件** | Radix UI + shadcn/ui | - | 无障碍、可定制的组件库 |
| **状态管理** | Zustand | 5.0.6 | 轻量级状态管理库 |
| **通信协议** | WebSocket | - | OCPP 1.6 协议实现 |
| **表单处理** | React Hook Form | 7.54.1 | 高性能表单库 |
| **图标库** | Lucide React | 0.454.0 | 现代化图标库 |
| **动画库** | Framer Motion | 12.23.9 | 流畅的动画效果 |
| **数据可视化** | Recharts | 2.15.0 | 充电数据图表展示 |
| **通知组件** | React Hot Toast | 2.5.2 | 用户反馈提示 |

## 📁 项目结构

```
ev-charging-simulator/
├── 📱 app/                          # Next.js App Router 页面
│   ├── 🏠 page.tsx                 # 首页 - 充电站列表
│   ├── 🏢 stations/[stationId]/    # 充电站详情页
│   │   ├── page.tsx                # 充电站详情
│   │   └── ⚡ chargers/[chargerId]/ # 充电桩相关页面
│   │       ├── page.tsx            # 充电桩详情（连接器选择）
│   │       ├── 🔌 connect/         # 插枪页面
│   │       └── 🔋 charging/        # 充电过程页面
│   └── ⚙️ settings/                # 开发者设置页面
├── 🧩 components/                   # 可复用组件
│   ├── ui/                         # 基础UI组件 (shadcn/ui)
│   │   ├── button.tsx              # 按钮组件
│   │   ├── input.tsx               # 输入框组件
│   │   ├── dialog.tsx              # 对话框组件
│   │   └── ...                     # 其他UI组件
│   ├── StationCard.tsx             # 充电站卡片组件
│   └── theme-provider.tsx          # 主题提供者
├── 🎣 hooks/                       # 自定义 Hooks
│   ├── useHeartbeatManager.ts      # 心跳管理 Hook
│   ├── use-mobile.tsx              # 移动端检测 Hook
│   └── use-toast.ts                # Toast 通知 Hook
├── 📚 lib/                         # 核心库文件
│   ├── 🌐 api/                     # API 客户端
│   │   ├── client.ts               # 统一 API 客户端
│   │   └── stations.ts             # 充电站 API
│   ├── 📦 store/                   # 状态管理
│   │   └── chargingStore.ts        # 充电状态管理
│   ├── 🔌 websocket/               # WebSocket 管理
│   │   └── OCPPWebSocketManager.ts # OCPP WebSocket 管理器
│   └── utils.ts                    # 工具函数
├── 📝 types/                       # TypeScript 类型定义
│   ├── charging.ts                 # 充电相关类型
│   ├── api.ts                      # API 相关类型
│   └── websocket.ts                # WebSocket 相关类型
├── 🎨 styles/                      # 样式文件
│   └── globals.css                 # 全局样式
├── 📖 docs/                        # 项目文档
│   ├── api-documentation.md        # API 文档
│   ├── detail-design.md            # 详细设计文档
│   ├── develop-plan.md             # 开发计划
│   └── websocket_protocol_specification.md # WebSocket 协议规范
└── 🖼️ figma_assets/                # 设计资源
    ├── page1.png                   # 首页设计图
    ├── page2.png                   # 详情页设计图
    └── ...                         # 其他设计资源
```

## 🚀 核心特性详解

### OCPP 1.6 协议支持
本应用完整实现了 OCPP 1.6 协议的核心功能：

| 消息类型 | 功能描述 | 实现状态 |
|----------|----------|----------|
| **BootNotification** | 充电桩启动通知 | ✅ 已实现 |
| **Heartbeat** | 心跳检测 | ✅ 已实现 |
| **StatusNotification** | 状态变化通知 | ✅ 已实现 |
| **StartTransaction** | 启动充电事务 | ✅ 已实现 |
| **StopTransaction** | 停止充电事务 | ✅ 已实现 |
| **MeterValues** | 电表数据上报 | ✅ 已实现 |
| **Authorize** | 用户授权 | 🔄 计划中 |
| **RemoteStartTransaction** | 远程启动充电 | 🔄 计划中 |

### 充电桩状态管理
- **实时状态监控**: 支持 Available、Preparing、Charging、Faulted 等多种状态
- **连接器管理**: 支持多连接器充电桩，独立状态管理
- **故障检测**: 自动检测连接异常和通信故障
- **状态持久化**: 本地存储状态信息，页面刷新不丢失

### 数据可视化
- **实时图表**: 使用 Recharts 展示充电功率、电压、电流变化曲线
- **统计面板**: 充电站概览、连接器统计、充电会话统计
- **进度指示**: 充电进度条、剩余时间估算
- **历史数据**: 充电历史记录和数据分析

## 📊 开发进度

### ✅ 已完成功能 (90%)

#### 🏗️ 基础架构 (100%)
- [x] TypeScript 类型定义完善
- [x] API 客户端实现（支持重试、错误处理）
- [x] WebSocket 通信管理器（OCPP 1.6）
- [x] 项目依赖和构建配置

#### 🎨 用户界面 (95%)
- [x] 响应式首页充电站列表
- [x] 充电站详情页面
- [x] 充电桩选择和连接器选择
- [x] 插枪操作页面
- [x] 充电过程监控页面
- [x] 设置和开发者工具页面

#### ⚡ 充电流程 (90%)
- [x] 完整的插枪到拔枪流程
- [x] WebSocket 实时通信
- [x] 充电数据实时更新
- [x] 充电会话状态管理
- [x] 错误处理和重连机制

#### 🔧 系统功能 (85%)
- [x] 全局状态管理（Zustand）
- [x] 心跳管理和连接监控
- [x] 离线消息队列
- [x] 本地数据持久化

### 🚧 开发中功能 (10%)

#### 🛠️ 开发者工具
- [x] 基础设置页面
- [ ] 充电桩在线/离线手动控制
- [ ] WebSocket 消息日志查看器
- [ ] 性能监控和统计面板
- [ ] 调试模式和测试工具

## 🚀 快速开始

### 📋 环境要求
- **Node.js**: 18.0.0 或更高版本
- **包管理器**: npm、yarn 或 pnpm
- **浏览器**: Chrome 90+、Firefox 88+、Safari 14+
- **后端服务**: 需要配套的充电站管理后端服务

### 📦 安装依赖

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install

# 或使用 pnpm
pnpm install
```

### ⚙️ 环境配置

1. **复制环境变量文件**
```bash
cp .env.example .env.local
```

2. **配置环境变量**
```bash
# 充电站 API 服务地址
NEXT_PUBLIC_API_BASE_URL=http://localhost:8083/api/v1

# WebSocket 网关地址
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080/ocpp

# 调试模式（开发环境建议开启）
NEXT_PUBLIC_DEBUG_MODE=true

# 心跳间隔（毫秒，默认5分钟）
NEXT_PUBLIC_HEARTBEAT_INTERVAL=300000

# 重连配置
NEXT_PUBLIC_RECONNECT_ATTEMPTS=5
NEXT_PUBLIC_RECONNECT_INTERVAL=5000
```

### 🏃‍♂️ 启动应用

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint
```

应用将在 http://localhost:3000 启动。

### 🔧 开发工具

访问以下页面进行开发和调试：
- **主应用**: http://localhost:3000
- **设置页面**: http://localhost:3000/settings
- **API 文档**: 查看 `docs/api-documentation.md`

## 📖 使用说明

### 🔄 完整充电流程

#### 1. 🏠 浏览充电站
- 在首页查看附近的充电站列表
- 使用搜索功能查找特定充电站
- 通过筛选器按连接器类型（AC/DC）过滤
- 查看充电站的实时状态和可用连接器数量

#### 2. 🏢 选择充电站
- 点击充电站卡片进入详情页
- 查看充电站的详细信息（地址、营业时间等）
- 浏览该站点的所有充电桩和连接器

#### 3. ⚡ 选择充电桩
- 在充电站详情页选择可用的充电桩
- 查看充电桩的状态、功率、连接器类型
- 只能选择状态为"Available"的充电桩

#### 4. 🔌 选择连接器
- 选择合适的连接器类型（GB/T AC、GB/T DC、Type2、CCS等）
- 查看连接器的最大功率和当前状态
- 确认连接器兼容性

#### 5. 🔗 模拟插枪
- 点击"Simulate Connect Charger"按钮
- 系统发送 StatusNotification 消息
- 连接器状态变更为"Preparing"

#### 6. 🔋 开始充电
- 在充电页面点击"开始充电"按钮
- 系统发送 StartTransaction 消息
- 开始接收实时充电数据

#### 7. 📊 监控过程
- 实时查看充电功率、电压、电流
- 监控已充电量和充电时长
- 观察充电进度和预估完成时间

#### 8. ⏹️ 结束充电
- 点击"停止充电"按钮结束会话
- 系统发送 StopTransaction 消息
- 查看充电结果摘要

### 🛠️ 开发者功能

#### 设置页面 (`/settings`)
- **连接状态监控**: 查看所有充电桩的在线状态
- **手动控制**: 手动控制充电桩的在线/离线状态
- **批量操作**: 一键让所有充电桩上线或离线
- **连接统计**: 查看连接成功率和统计信息
- **调试信息**: 查看 WebSocket 连接详情和消息日志

#### 调试功能
- **实时日志**: 查看 OCPP 消息的发送和接收
- **状态监控**: 监控充电桩和连接器的状态变化
- **错误追踪**: 查看连接错误和重连尝试
- **性能监控**: 监控应用性能和内存使用

## 🔌 API 接口文档

### 📡 REST API 接口

#### 充电站管理
| 方法 | 端点 | 描述 | 参数 |
|------|------|------|------|
| `GET` | `/api/v1/stations` | 获取充电站列表 | `page`, `size`, `search` |
| `GET` | `/api/v1/stations/{stationId}` | 获取充电站详情 | `stationId` |
| `GET` | `/api/v1/stations/{stationId}/charge-points` | 获取充电桩列表 | `stationId` |

#### 充电桩管理
| 方法 | 端点 | 描述 | 参数 |
|------|------|------|------|
| `GET` | `/api/v1/charge-points/{chargePointId}` | 获取充电桩详情 | `chargePointId` |
| `GET` | `/api/v1/charge-points/{chargePointId}/connectors` | 获取连接器列表 | `chargePointId` |
| `POST` | `/api/v1/charge-points/{chargePointId}/commands/start-charging` | 启动充电 | `chargePointId`, `connectorId`, `idTag` |
| `POST` | `/api/v1/charge-points/{chargePointId}/commands/stop-charging` | 停止充电 | `chargePointId`, `transactionId` |

#### 充电会话管理
| 方法 | 端点 | 描述 | 参数 |
|------|------|------|------|
| `GET` | `/api/v1/transactions` | 获取充电会话列表 | `page`, `size`, `status` |
| `GET` | `/api/v1/transactions/{transactionId}` | 获取充电会话详情 | `transactionId` |

### 🔌 WebSocket 连接

#### OCPP 1.6 WebSocket
- **连接地址**: `ws://localhost:8080/ocpp/{chargePointId}`
- **协议**: OCPP 1.6 JSON over WebSocket
- **认证**: 基于 chargePointId 的连接认证

#### 支持的 OCPP 消息类型
```json
// 心跳消息
[2, "unique-id", "Heartbeat", {}]

// 状态通知
[2, "unique-id", "StatusNotification", {
  "connectorId": 1,
  "status": "Available",
  "errorCode": "NoError"
}]

// 启动事务
[2, "unique-id", "StartTransaction", {
  "connectorId": 1,
  "idTag": "user123",
  "meterStart": 0,
  "timestamp": "2025-01-27T10:00:00.000Z"
}]

// 停止事务
[2, "unique-id", "StopTransaction", {
  "transactionId": 123,
  "meterStop": 1500,
  "timestamp": "2025-01-27T11:00:00.000Z"
}]

// 电表数据
[2, "unique-id", "MeterValues", {
  "connectorId": 1,
  "transactionId": 123,
  "meterValue": [{
    "timestamp": "2025-01-27T10:30:00.000Z",
    "sampledValue": [{
      "value": "7500",
      "measurand": "Power.Active.Import",
      "unit": "W"
    }]
  }]
}]
```

### 🔧 环境配置

#### 开发环境
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8083/api/v1
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080/ocpp
```

#### 测试环境
```bash
NEXT_PUBLIC_API_BASE_URL=https://test-api.example.com/api/v1
NEXT_PUBLIC_WEBSOCKET_URL=wss://test-ws.example.com/ocpp
```

#### 生产环境
```bash
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
NEXT_PUBLIC_WEBSOCKET_URL=wss://ws.example.com/ocpp
```

## 🧪 测试

### 运行测试
```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行端到端测试
npm run test:e2e
```

### 测试覆盖范围
- **单元测试**: WebSocket 管理器、API 客户端、工具函数
- **集成测试**: 充电流程、状态管理、错误处理
- **端到端测试**: 完整用户操作流程

## 🚀 部署

### Vercel 部署（推荐）
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署到 Vercel
vercel --prod
```

### Docker 部署
```bash
# 构建镜像
docker build -t ev-charging-simulator .

# 运行容器
docker run -p 3000:3000 ev-charging-simulator
```

### 传统服务器部署
```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 🤝 贡献指南

我们欢迎所有形式的贡献！请遵循以下步骤：

### 开发流程
1. **Fork 项目** 到你的 GitHub 账户
2. **创建功能分支** (`git checkout -b feature/amazing-feature`)
3. **遵循代码规范** 使用 ESLint 和 Prettier
4. **编写测试** 确保新功能有对应的测试
5. **提交更改** (`git commit -m 'feat: add amazing feature'`)
6. **推送分支** (`git push origin feature/amazing-feature`)
7. **创建 Pull Request** 详细描述你的更改

### 代码规范
- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 配置的代码风格
- 使用 Prettier 进行代码格式化
- 编写清晰的注释和文档
- 遵循 Git 提交信息规范（Conventional Commits）

### 提交信息规范
```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具的变动
```

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) - 查看 LICENSE 文件了解详情。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - 强大的 React 框架
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [Radix UI](https://www.radix-ui.com/) - 无障碍的 UI 组件
- [Zustand](https://github.com/pmndrs/zustand) - 轻量级状态管理
- [OCPP](https://www.openchargealliance.org/) - 开放充电点协议

## 📞 支持

如果你在使用过程中遇到问题，可以通过以下方式获取帮助：

- 📖 查看 [文档](docs/)
- 🐛 提交 [Issue](https://github.com/your-username/ev-charging-simulator/issues)
- 💬 参与 [讨论](https://github.com/your-username/ev-charging-simulator/discussions)
- 📧 发送邮件到 support@example.com

---

<div align="center">
  <p>⭐ 如果这个项目对你有帮助，请给它一个星标！</p>
  <p>Made with ❤️ by the EV Charging Simulator Team</p>
</div>
