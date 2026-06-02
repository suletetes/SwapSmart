/**
 * Station Factory — creates test stations with configurable slot counts and battery states
 */

export type BatteryState = 'Charging' | 'Ready' | 'Reserved' | 'In_Vehicle' | 'Depleted' | 'Maintenance';

export interface TestBattery {
  batteryId: string;
  state: BatteryState;
  chargeLevel: number;
  healthScore: number;
  cycleCount: number;
  reservationId?: string;
}

export interface TestStation {
  stationId: string;
  name: string;
  totalSlots: number;
  batteries: TestBattery[];
  availableCount: number;
}

export interface StationFactoryOptions {
  stationId?: string;
  name?: string;
  totalSlots?: number;
  batteries?: Partial<TestBattery>[];
  readyCount?: number;
  chargingCount?: number;
  reservedCount?: number;
  inVehicleCount?: number;
  depletedCount?: number;
  maintenanceCount?: number;
}

let stationCounter = 0;
let batteryCounter = 0;

export function createTestStation(options: StationFactoryOptions = {}): TestStation {
  stationCounter++;
  const stationId = options.stationId || `station-${stationCounter}`;
  const name = options.name || `Test Station ${stationCounter}`;

  if (options.batteries) {
    const batteries: TestBattery[] = options.batteries.map((b, i) => ({
      batteryId: b.batteryId || `bat-${++batteryCounter}`,
      state: b.state || 'Ready',
      chargeLevel: b.chargeLevel ?? 100,
      healthScore: b.healthScore ?? 90,
      cycleCount: b.cycleCount ?? 50,
      reservationId: b.reservationId,
    }));
    const totalSlots = options.totalSlots || batteries.length;
    const availableCount = batteries.filter(b => b.state === 'Ready').length;
    return { stationId, name, totalSlots, batteries, availableCount };
  }

  const readyCount = options.readyCount ?? 3;
  const chargingCount = options.chargingCount ?? 0;
  const reservedCount = options.reservedCount ?? 0;
  const inVehicleCount = options.inVehicleCount ?? 0;
  const depletedCount = options.depletedCount ?? 0;
  const maintenanceCount = options.maintenanceCount ?? 0;

  const totalSlots = options.totalSlots ??
    (readyCount + chargingCount + reservedCount + inVehicleCount + depletedCount + maintenanceCount);

  const batteries: TestBattery[] = [];

  const addBatteries = (count: number, state: BatteryState, chargeLevel: number) => {
    for (let i = 0; i < count; i++) {
      batteries.push({
        batteryId: `bat-${++batteryCounter}`,
        state,
        chargeLevel,
        healthScore: 85 + Math.floor(Math.random() * 15),
        cycleCount: Math.floor(Math.random() * 200),
      });
    }
  };

  addBatteries(readyCount, 'Ready', 100);
  addBatteries(chargingCount, 'Charging', 50);
  addBatteries(reservedCount, 'Reserved', 100);
  addBatteries(inVehicleCount, 'In_Vehicle', 80);
  addBatteries(depletedCount, 'Depleted', 10);
  addBatteries(maintenanceCount, 'Maintenance', 0);

  return { stationId, name, totalSlots, batteries, availableCount: readyCount };
}

export function resetFactoryCounters(): void {
  stationCounter = 0;
  batteryCounter = 0;
}
