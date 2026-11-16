import { BleManager } from 'react-native-ble-plx';

/**
 * BLE 连接层：扫描 AFU-WL-TZ-A1 → 连接 → 写用户参数 → 订阅收包。
 * 使用 react-native-ble-plx 3.x。
 */

export const NOTIFY_UUID = '0000ffb2-0000-1000-8000-00805f9b34fb';
export const WRITE_UUID = '0000ffb1-0000-1000-8000-00805f9b34fb';
export const SERVICE_UUID = '0000ffb0-0000-1000-8000-00805f9b34fb';

export interface UserProfile {
  age: number;
  sex: 'male' | 'female';
  height: number;
  unit: string;
}

export interface MeasurementResult {
  weight_kg: number;
  impedance_1: number | null;
  impedance_2: number | null;
  locked: boolean;
}

const SEX_INT: Record<string, number> = { male: 2, female: 1 };

let manager: BleManager | null = null;
function getManager(): BleManager {
  if (!manager) manager = new BleManager();
  return manager;
}

/** 扫描并返回所有 AFU-WL* 设备的地址 */
export async function scanAfuScales(timeoutMs = 10000): Promise<string[]> {
  const m = getManager();
  const results: string[] = [];
  const listener = (error: unknown, device: { id: string; name: string | null } | null) => {
    if (error || !device) return;
    const name = (device.name || '').toLowerCase();
    if (name.includes('afu-wl') && !results.includes(device.id)) {
      results.push(device.id);
    }
  };
  m.startDeviceScan(null, { allowDuplicates: true }, listener);
  await new Promise((r) => setTimeout(r, timeoutMs));
  await m.stopDeviceScan();
  return results;
}

/**
 * 连接设备、写用户参数、订阅收包，返回一个 stop 函数。
 * onMeasurement: 每次收到有效体重包时回调。
 * onDisconnect: 连接断开时回调。
 */
export async function connectAndMeasure(
  deviceId: string,
  profile: UserProfile,
  onMeasurement: (r: MeasurementResult) => void,
  onDisconnect: () => void,
  durationMs = 30000,
): Promise<() => void> {
  const m = getManager();
  let stopped = false;

  const device = await m.connectToDevice(deviceId);
  await device.discoverAllServicesAndCharacteristics();

  // 写用户参数触发测量
  const sexInt = SEX_INT[profile.sex] ?? 1;
  const cmd = new Uint8Array([0x10, 0x00, sexInt, profile.age, profile.height]);
  // ble-plx 需要 base64 字符串
  let base64 = '';
  try {
    base64 = (global as { Buffer?: { from: (b: Uint8Array) => { toString: (e: string) => string } } }).Buffer
      ? (global as { Buffer: { from: (b: Uint8Array) => { toString: (e: string) => string } } }).Buffer.from(cmd).toString('base64')
      : '';
  } catch {
    base64 = '';
  }
  if (!base64) {
    base64 = btoa(String.fromCharCode(...cmd));
  }
  await m.writeCharacteristicWithoutResponseForDevice(deviceId, SERVICE_UUID, WRITE_UUID, base64);

  // 订阅通知
  const sub = m.monitorCharacteristicForDevice(
    deviceId,
    SERVICE_UUID,
    NOTIFY_UUID,
    (error: unknown, characteristic: { value: string | null } | null) => {
      if (error || !characteristic || !characteristic.value) return;
      // value 是 base64 字符串
      const bin = atob(characteristic.value);
      const data = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
      if (data.length < 13) return;
      const type = data[2];
      if (type !== 0x00 && type !== 0x02) return;
      const wRaw = (data[10] << 16) | (data[11] << 8) | data[12];
      const weightKg = Math.round(((wRaw - 0x680000) / 1000.0) * 100) / 100;
      const imp1 = (data[4] << 8) | data[5];
      const imp2 = (data[6] << 8) | data[7];
      onMeasurement({
        weight_kg: weightKg,
        impedance_1: imp1,
        impedance_2: imp2,
        locked: type === 0x02,
      });
    },
  );

  const stop = () => {
    if (stopped) return;
    stopped = true;
    try { sub.remove(); } catch {}
    try { m.cancelDeviceConnection(deviceId).catch(() => {}); } catch {}
  };

  setTimeout(stop, durationMs);
  return stop;
}

export async function disconnectAll(): Promise<void> {
  const m = getManager();
  try {
    const devices = await m.connectedDevices([]);
    for (const d of devices) {
      try { await m.cancelDeviceConnection(d.id); } catch {}
    }
  } catch {}
}
