import { BleManager } from 'react-native-ble-plx';

/**
 * BLE 连接层 v4：保持连接的持续测量。
 * - 已绑定 MAC 直接 connectToDevice（免扫描）
 * - 测完【不断开】，保持 notify 订阅，秤下次推数据即刻拿到
 * - 仅断线时自动重连（带退避）
 * - 未绑定时间歇扫描（5s 扫 / 15s 周期，防系统 denylist）
 */
export const NOTIFY_UUID = '0000ffb2-0000-1000-8000-00805f9b34fb';
export const WRITE_UUID = '0000ffb1-0000-1000-8000-00805f9b34fb';
export const SERVICE_UUID = '0000ffb0-0000-1000-8000-00805f9b34fb';

export interface UserProfile { age: number; sex: 'male' | 'female'; height: number; unit: string }
export interface MeasurementResult {
  weight_kg: number;
  impedance_1: number | null;
  impedance_2: number | null;
  adcs: number[];            // 多频阻抗原始值
  electrode_on: boolean;     // 电极是否导通（脚踩满四极）
  alg_type: number | null;   // 体脂算法类型
  locked: boolean;
}
export interface ScannedDeviceInfo {
  id: string; name: string; rssi: number;
  manufacturerData?: string; serviceUuids?: string; ts?: number;
  displayName?: string;   // 已绑定设备的备注名（由上层填入）
  bound?: boolean;
}
export type DebugLog = { ts: number; msg: string };

const SEX_INT: Record<string, number> = { male: 2, female: 1 };

let manager: BleManager | null = null;
export function getManager(): BleManager {
  if (!manager) manager = new BleManager();
  return manager;
}

// ---------- 调试日志 ----------
let debugLogs: DebugLog[] = [];
export function pushDebug(msg: string): void {
  debugLogs = [...debugLogs.slice(-80), { ts: Date.now(), msg }];
}
export function getDebugLogs(): DebugLog[] { return debugLogs; }
export function clearDebugLogs(): void { debugLogs = []; }

// ---------- 扫描 ----------
let scanActive = false;
let scanInterval: ReturnType<typeof setInterval> | null = null;
let scanCount = 0;
const lastFound = new Map<string, number>();

export function getScanStats(): { count: number; active: boolean } {
  return { count: scanCount, active: scanActive };
}

export function startContinuousScan(handlers: {
  onScaleFound: (deviceId: string) => void;
  devList?: (devices: ScannedDeviceInfo[]) => void;
}): () => void {
  const m = getManager();
  if (scanActive) return () => {};
  scanActive = true;
  const seen = new Map<string, ScannedDeviceInfo>();
  pushDebug('扫描启动（5s/15s 间歇）');

  const doScan = () => {
    if (!scanActive) return;
    try {
      m.startDeviceScan(null, { allowDuplicates: true, scanMode: 2, legacyScan: true }, (error, device) => {
        if (error || !device) return;
        scanCount += 1;
        const name = device.name || '';
        const info: ScannedDeviceInfo = {
          id: device.id, name: name || '(无名)', rssi: device.rssi ?? -100,
          manufacturerData: typeof device.manufacturerData === 'string' ? device.manufacturerData : undefined,
          serviceUuids: (device.serviceUUIDs || []).join(','),
          ts: Date.now(),
        };
        if (handlers.devList) {
          seen.set(device.id, info);
          handlers.devList(Array.from(seen.values()).sort((a, b) => b.rssi - a.rssi).slice(0, 20));
        }
        if (name.toLowerCase().includes('afu-wl')) {
          const now = Date.now();
          if (now - (lastFound.get(device.id) || 0) > 3000) {
            lastFound.set(device.id, now);
            pushDebug('扫描发现秤 ' + device.id);
            handlers.onScaleFound(device.id);
          }
        }
      });
    } catch (e) { pushDebug('scan err: ' + e); }
    setTimeout(() => { try { m.stopDeviceScan(); } catch {} }, 5000);
  };
  doScan();
  scanInterval = setInterval(doScan, 15000);

  return () => {
    if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
    try { m.stopDeviceScan(); } catch {}
    scanActive = false;
  };
}

export function stopScan(): void {
  if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
  if (scanActive) { getManager().stopDeviceScan(); scanActive = false; }
}

// ---------- 持久测量会话（保持连接） ----------
export interface MeasureSession {
  stop: () => void;
  isConnected: () => boolean;
}

let activeSession: MeasureSession | null = null;

/**
 * 启动持久测量会话：连上后保持连接 + notify 订阅，持续接收每一次测量。
 * 断线自动重连；调用返回的 stop() 才真正断开。
 */
export async function startMeasureSession(
  deviceId: string,
  profile: UserProfile,
  onMeasurement: (r: MeasurementResult) => void,
  onState: (state: 'connecting' | 'connected' | 'listening' | 'disconnected' | 'error', detail?: string) => void,
): Promise<MeasureSession> {
  const m = getManager();
  let stopped = false;
  let connected = false;
  let sub: { remove: () => void } | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const session: MeasureSession = {
    stop: () => {
      if (stopped) return;
      stopped = true;
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
      try { sub?.remove(); } catch {}
      sub = null;
      try { m.cancelDeviceConnection(deviceId).catch(() => {}); } catch {}
      connected = false;
      if (activeSession === session) activeSession = null;
      pushDebug('会话停止');
      onState('disconnected', '用户停止');
    },
    isConnected: () => connected,
  };
  activeSession = session;

  const scheduleReconnect = (delay: number) => {
    if (stopped || retryTimer) return;
    retryTimer = setTimeout(() => { retryTimer = null; if (!stopped) void connect(); }, delay);
  };

  async function connect(): Promise<void> {
    if (stopped) return;
    onState('connecting');
    pushDebug('连接 ' + deviceId);
    try {
      const dev = await m.connectToDevice(deviceId, { timeout: 15000 });
      if (stopped) { try { m.cancelDeviceConnection(deviceId).catch(() => {}); } catch {}; return; }
      connected = true;
      pushDebug('已连接，发现服务');
      await dev.discoverAllServicesAndCharacteristics();

      const sexInt = SEX_INT[profile.sex] ?? 1;
      const cmd = new Uint8Array([0x10, 0x00, sexInt, profile.age, profile.height]);
      const b64 = btoa(String.fromCharCode(...cmd));
      try {
        await m.writeCharacteristicWithoutResponseForDevice(deviceId, SERVICE_UUID, WRITE_UUID, b64);
        pushDebug('已写用户参数');
      } catch (e) {
        pushDebug('写参数失败(继续监听): ' + e);
      }

      // 关键：保持订阅，不主动断开
      sub = m.monitorCharacteristicForDevice(deviceId, SERVICE_UUID, NOTIFY_UUID,
        (error, ch) => {
          if (stopped) return;
          if (error) { pushDebug('notify err: ' + (error.message || '')); return; }
          if (!ch?.value) return;
          const bin = atob(ch.value);
          const data = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
          if (data.length < 13) return;
          const type = data[2];
          if (type !== 0x00 && type !== 0x02) return;
          const wRaw = (data[10] << 16) | (data[11] << 8) | data[12];
          const weightKg = Math.round(((wRaw - 0x680000) / 1000.0) * 100) / 100;
          // 多频阻抗：bytes[4..9] 共 3 组 16 位（可能含 5 频，按实际可用解释）
          const imp: number[] = [];
          for (let k = 4; k + 1 <= Math.min(10, data.length - 1); k += 2) {
            imp.push((data[k] << 8) | data[k + 1]);
          }
          // 电极导通：阻抗非全零即认为脚踩到了电极
          const electrodeOn = imp.some((v) => v > 0);
          pushDebug('收包 type=' + type + ' w=' + weightKg + ' imp=' + JSON.stringify(imp));
          onMeasurement({
            weight_kg: weightKg,
            impedance_1: (data[4] << 8) | data[5],
            impedance_2: (data[6] << 8) | data[7],
            adcs: imp,
            electrode_on: electrodeOn,
            alg_type: data.length > 13 ? data[13] : null,
            locked: type === 0x02,
          });
        });

      onState('listening');
      pushDebug('监听中，等待测量');

      // 断线监听：自动重连
      m.onDeviceDisconnected(deviceId, () => {
        if (stopped) return;
        connected = false;
        try { sub?.remove(); } catch {}
        sub = null;
        pushDebug('连接断开，3s 后重连');
        onState('disconnected', '自动重连中');
        scheduleReconnect(3000);
      });
    } catch (e) {
      connected = false;
      const msg = e instanceof Error ? e.message : String(e);
      pushDebug('连接失败: ' + msg);
      onState('error', msg);
      scheduleReconnect(5000);
    }
  }

  await connect();
  return session;
}

export function stopMeasureSession(): void {
  if (activeSession) { activeSession.stop(); activeSession = null; }
}

export async function disconnectAll(): Promise<void> {
  try {
    const devices = await getManager().connectedDevices([]);
    for (const d of devices) { try { await getManager().cancelDeviceConnection(d.id); } catch {} }
  } catch {}
}
