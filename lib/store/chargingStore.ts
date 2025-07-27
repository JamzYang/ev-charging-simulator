import { create } from 'zustand'
import { ChargingSession, ChargePoint, ChargingData } from '@/types/charging'
import { ocppWebSocketManager } from '@/lib/websocket/OCPPWebSocketManager'

interface ChargingState {
  // 当前充电会话
  currentSession: ChargingSession | null
  // 充电桩状态缓存
  chargePointStatuses: Map<string, ChargePoint>
  // 充电数据
  chargingData: ChargingData
  // 充电状态
  chargingStatus: 'idle' | 'preparing' | 'charging' | 'finishing' | 'completed'
  // 充电开始时间
  chargingStartTime: Date | null
  // 充电持续时间（秒）
  chargingDuration: number
  
  // Actions
  startChargingSession: (session: ChargingSession) => void
  updateChargingData: (data: Partial<ChargingData>) => void
  updateChargingStatus: (status: ChargingState['chargingStatus']) => void
  endChargingSession: () => void
  updateChargePointStatus: (chargePointId: string, status: ChargePoint) => void
  resetChargingData: () => void
}

export const useChargingStore = create<ChargingState>((set, get) => ({
  currentSession: null,
  chargePointStatuses: new Map(),
  chargingData: {
    power: 0,
    voltage: 0,
    current: 0,
    energy: 0,
    temperature: 25,
    soc: 0
  },
  chargingStatus: 'idle',
  chargingStartTime: null,
  chargingDuration: 0,

  startChargingSession: (session) => {
    set({ 
      currentSession: session,
      chargingStatus: 'preparing',
      chargingStartTime: new Date(),
      chargingDuration: 0
    })
    
    // 开始模拟充电数据
    const interval = setInterval(() => {
      const current = get().currentSession
      const status = get().chargingStatus
      
      if (!current || status === 'completed' || status === 'idle') {
        clearInterval(interval)
        return
      }

      // 更新充电持续时间
      const startTime = get().chargingStartTime
      if (startTime) {
        const duration = Math.floor((Date.now() - startTime.getTime()) / 1000)
        set({ chargingDuration: duration })
      }

      // 只有在充电状态时才更新数据
      if (status === 'charging') {
        // 模拟充电数据变化
        const currentData = get().chargingData
        const newData: ChargingData = {
          power: 7000 + Math.random() * 1000, // 7-8kW
          voltage: 220 + Math.random() * 10,  // 220-230V
          current: 32 + Math.random() * 4,    // 32-36A
          energy: currentData.energy + 0.1,   // 每秒增加0.1kWh
          temperature: 25 + Math.random() * 10, // 25-35°C
          soc: Math.min(100, currentData.soc + 0.05) // SOC增长
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
              },
              {
                value: newData.temperature?.toFixed(1) || "25.0",
                measurand: "Temperature",
                unit: "Celsius"
              },
              {
                value: newData.soc?.toFixed(1) || "0.0",
                measurand: "SoC",
                unit: "Percent"
              }
            ]
          ).catch(console.error)
        }
      }
    }, 1000) // 每秒更新一次
  },

  updateChargingData: (data) => {
    set({ chargingData: { ...get().chargingData, ...data } })
  },

  updateChargingStatus: (status) => {
    set({ chargingStatus: status })
    
    // 如果状态变为charging，开始计时
    if (status === 'charging' && !get().chargingStartTime) {
      set({ chargingStartTime: new Date() })
    }
  },

  endChargingSession: () => {
    const session = get().currentSession
    if (session) {
      // 发送停止交易消息
      const finalEnergy = get().chargingData.energy
      ocppWebSocketManager.sendStopTransaction(
        session.chargePointId,
        session.transactionId || 0,
        Math.round(finalEnergy * 1000), // 转换为Wh
        'Local'
      ).catch(console.error)
    }
    
    set({ 
      currentSession: null,
      chargingStatus: 'completed',
      chargingStartTime: null
    })
  },

  resetChargingData: () => {
    set({
      chargingData: {
        power: 0,
        voltage: 0,
        current: 0,
        energy: 0,
        temperature: 25,
        soc: 0
      },
      chargingStatus: 'idle',
      chargingStartTime: null,
      chargingDuration: 0
    })
  },

  updateChargePointStatus: (chargePointId, status) => {
    const statuses = new Map(get().chargePointStatuses)
    statuses.set(chargePointId, status)
    set({ chargePointStatuses: statuses })
  }
}))

// 辅助函数
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export const formatEnergy = (energy: number): string => {
  if (energy < 1) {
    return `${(energy * 1000).toFixed(0)} Wh`
  }
  return `${energy.toFixed(2)} kWh`
}

export const formatPower = (power: number): string => {
  if (power < 1000) {
    return `${power.toFixed(0)} W`
  }
  return `${(power / 1000).toFixed(1)} kW`
}
