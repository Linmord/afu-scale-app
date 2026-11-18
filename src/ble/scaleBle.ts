import { BleManager, ScanMode, ScanCallbackType } from 'react-native-ble-plx';

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

export interface UserProfile { age: number; sex: 'male' | 'female'; height: number; unit: string; weightKg?: number }
/** 测量阶段：正在测量 → 阻抗测量 → 测量完成 */
export type MeasurePhase = 'weighing' | 'impedance' | 'done';

export interface MeasurementResult {
  weight_kg: number;
  impedance_1: number | null;
  impedance_2: number | null;
  adcs: number[];            // 多频阻抗原始值
  electrode_on: boolean;     // 电极是否导通（脚踩满四极）
  alg_type: number | null;   // 体脂算法类型
  locked: boolean;
  battery?: number | null;   // 电量百分比（实时包 data[11] 低 7 位）
  phase?: MeasurePhase;      // 当前测量阶段
  timedOut?: boolean;        // 是否因超时强制结束（充电中等无法测量的场景）
}
export interface ScannedDeviceInfo {
  id: string; name: string; rssi: number;
  realMac?: string;       // 从 Service Data 27AC 提取的真实 MAC（字节反转）
  protocolByte?: number;  // 协议标识字节（如 0x27），用于握手 deviceType
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
  // 强制清理上一次残留的扫描（否则 scanActive 卡 true 会导致新扫描静默失效）
  if (scanActive) {
    try { m.stopDeviceScan(); } catch {}
    scanActive = false;
  }
  scanActive = true;
  lastFound.clear();   // 新扫描会话清空节流，避免重绑同一台秤被3秒窗口挡住
  const seen = new Map<string, ScannedDeviceInfo>();
  pushDebug('扫描启动（持续模式，全广播类型）');

  const doScan = () => {
    if (!scanActive) return;
    try {
      m.startDeviceScan(null, {
          allowDuplicates: true,
          scanMode: ScanMode.LowLatency,
          callbackType: ScanCallbackType.AllMatches,
        }, (error, device) => {
        if (error) {
          pushDebug('scan error: ' + (error.message || String(error)));
          return;
        }
        if (!device) return;
        scanCount += 1;
        const name = device.name || '';
        const uuids = device.serviceUUIDs || [];
        // 解析 Service Data UUID 27AC（WeighTrace 协议文档：含真实MAC+协议标识）
        let realMac: string | undefined;
        let protocolByte: number | undefined;
        const sd = (device as unknown as { serviceData?: Record<string, string> | null }).serviceData;
        if (sd) {
          for (const [uuid, b64] of Object.entries(sd)) {
            if (!uuid.toLowerCase().includes('27ac') || typeof b64 !== 'string') continue;
            try {
              const bin = atob(b64);
              const bytes: number[] = [];
              for (let i = 0; i < bin.length; i++) bytes.push(bin.charCodeAt(i));
              // payload: [protocolByte][MAC 6字节小端][01] → 重建 AC 27 ...
              // WeighTrace: payload=[MAC 6字节小端][01]，AC27前缀重建时加
              if (bytes.length >= 6) {
                const macBytes = bytes.slice(0, 6).reverse();
                realMac = macBytes.map((x) => x.toString(16).padStart(2, '0').toUpperCase()).join(':');
                protocolByte = 0x27;
              }
            } catch {}
          }
        }
        // 厂商数据 base64 解码备用
        let mdBytes = '';
        if (typeof device.manufacturerData === 'string' && device.manufacturerData) {
          try {
            const bin = atob(device.manufacturerData);
            for (let i = 0; i < bin.length; i++) mdBytes += bin.charCodeAt(i).toString(16).padStart(2, '0');
          } catch { mdBytes = ''; }
        }
        const isScale = name.toLowerCase().includes('afu-wl')
          || !!realMac
          || uuids.some((u) => {
            const low = u.toLowerCase();
            return low.includes('ffb0') || low.includes('1530');
          })
          || mdBytes.includes('ac27') || mdBytes.includes('27ac');
        const info: ScannedDeviceInfo = {
          id: device.id, name: name || '', rssi: device.rssi ?? -100,
          realMac, protocolByte,
          manufacturerData: typeof device.manufacturerData === 'string' ? device.manufacturerData : undefined,
          serviceUuids: (device.serviceUUIDs || []).join(','),
          ts: Date.now(),
        };
        if (handlers.devList) {
          seen.set(device.id, info);
          handlers.devList(Array.from(seen.values()).sort((a, b) => b.rssi - a.rssi).slice(0, 20));
        }

        if (isScale) {
          const now = Date.now();
          if (now - (lastFound.get(device.id) || 0) > 3000) {
            lastFound.set(device.id, now);
            pushDebug('扫描发现秤 ' + device.id);
            handlers.onScaleFound(device.id);
          }
        }
      });
    } catch (e) { pushDebug('scan err: ' + e); }
  };
  doScan();   // 持续扫描，不设间歇空窗（对齐系统蓝牙的行为）

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

// ---------- 秤历史包(216)解码 ----------
export interface ScaleHistoryEvent {
  time: number;              // unix 秒
  weight_kg: number;
  adcs: number[];
}

/** 解码 216 历史包（data[18]===216），返回事件数组 */
export function decodeHistoryPacket(data: Uint8Array): ScaleHistoryEvent[] {
  if (data.length < 20 || data[18] !== 216) return [];
  const events: ScaleHistoryEvent[] = [];
  const dt = data[0];
  if (dt !== 42) {
    const time = (data[3] << 24 | data[4] << 16 | data[5] << 8 | data[6]) >>> 0;
    const wRaw = ((data[8] << 16) | (data[9] << 8) | data[10]) - 0x680000;
    const weightKg = Math.round(wRaw / 10) / 100;
    const adcs = [(data[11] << 8) | data[12], (data[13] << 8) | data[14]];
    events.push({ time, weight_kg: weightKg, adcs });
  }
  return events;
}

// ---------- 设备信息服务（DIS 0x180A，标准蓝牙服务） ----------
const DIS_SERVICE = '0000180a-0000-1000-8000-00805f9b34fb';

const DIS_CHARS = {
  manufacturer: '00002a29-0000-1000-8000-00805f9b34fb',
  model: '00002a24-0000-1000-8000-00805f9b34fb',
  firmware: '00002a26-0000-1000-8000-00805f9b34fb',
  software: '00002a28-0000-1000-8000-00805f9b34fb',
};

/** 读取设备信息（制造商/型号/固件/软件版本），失败项返回 undefined */
export async function readDeviceInfo(deviceId: string): Promise<{
  manufacturer?: string; model?: string; firmware?: string; software?: string;
}> {
  const m = getManager();
  const out: Record<string, string | number> = {};
  for (const [key, uuid] of Object.entries(DIS_CHARS)) {
    try {
      const ch = await m.readCharacteristicForDevice(deviceId, DIS_SERVICE, uuid);
      if (ch?.value) {
        const bin = atob(ch.value);
        let s = '';
        for (let i = 0; i < bin.length; i++) {
          const c = bin.charCodeAt(i);
          if (c >= 32 && c < 127) s += String.fromCharCode(c);
        }
        if (s.trim()) out[key] = s.trim();
      }
    } catch { /* 该特征不存在或不可读，跳过 */ }
  }
  pushDebug('DIS: ' + JSON.stringify(out));
  return out;
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
  onHistory?: (events: ScaleHistoryEvent[]) => void,
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
      const dev = await m.connectToDevice(deviceId, { timeout: 10000 });
      if (stopped) { try { m.cancelDeviceConnection(deviceId).catch(() => {}); } catch {}; return; }
      connected = true;
      pushDebug('已连接，发现服务');
      await dev.discoverAllServicesAndCharacteristics();

      // ⭐ 官方 27 协议完整序列（HCI 抓包逆向：蚂蚁 App 的真实触发方式）
      const utcQuarters = Math.trunc((-new Date().getTimezoneOffset() * 60) / 900) & 0xFF;
      const nowSec = Math.trunc(Date.now() / 1000);
      const sexVal = profile.sex === 'male' ? 1 : 2;
      // 官方帧：ac 27 + payload + [index18=标识字节] + [index19=校验]
      // 标识字节：0xDF(对时/查询) 0xD1(用户) 0xD0(完整握手)
      const mkFrame = (payload: number[], tailByte: number): Uint8Array => {
        const f = new Uint8Array(20);
        f[0] = 0xAC; f[1] = 0x27;
        for (let i = 0; i < payload.length && i + 2 < 18; i++) f[2 + i] = payload[i];
        f[18] = tailByte;
        let sum = 0;
        for (let i = 2; i < 19; i++) sum = (sum + f[i]) & 0xFF;
        f[19] = sum;
        return f;
      };
      const writeCmd = async (name: string, frame: Uint8Array) => {
        try {
          const b64 = btoa(String.fromCharCode(...frame));
          await m.writeCharacteristicWithoutResponseForDevice(deviceId, SERVICE_UUID, WRITE_UUID, b64);
          pushDebug(name + ' ✓');
        } catch (e) {
          pushDebug(name + ' 失败: ' + e);
        }
        await new Promise((r) => setTimeout(r, 600));
      };


      // 关键：保持订阅，不主动断开
      const batteryVotes = new Map<number, number>();
      let batteryStable: number | null = null;
      let measurementStartedAt = 0;    // 首次收到 weight>0 的时间（测量开始）
      let lastPhaseNotified: MeasurePhase | null = null;
      sub = m.monitorCharacteristicForDevice(deviceId, SERVICE_UUID, NOTIFY_UUID,
        (error, ch) => {
          if (stopped) return;
          if (error) { pushDebug('notify err: ' + (error.message || '')); return; }
          if (!ch?.value) return;
          const bin = atob(ch.value);
          const data = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
          if (data.length < 13) return;
          // ⭐ type=01 明文历史记录包（实测验证）：
          // data[3:7]=时间戳(unix大端) data[7]=标志 data[8:11]=体重(3字节-0x680000) data[11:13]=阻抗1 data[13:15]=阻抗2
          if (data[2] === 0x01 && data.length >= 15) {
            const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
            const time = dv.getUint32(3);
            const wRaw = ((data[8] << 16) | (data[9] << 8) | data[10]) - 0x680000;
            const weightKg = Math.round(wRaw / 10) / 100;
            const imp1 = (data[11] << 8) | data[12];
            const imp2 = (data[13] << 8) | data[14];
            if (weightKg >= 10 && time > 1000000000) {
              const ev = { time, weight_kg: weightKg, adcs: [imp1, imp2] };
              pushDebug(`历史记录: ${new Date(time*1000).toLocaleString('zh-CN')} ${weightKg}kg 阻抗${imp1}/${imp2}`);
              if (onHistory) onHistory([ev]);
            }
            return;
          }
          const type = data[2];
          if (type !== 0x00 && type !== 0x02 && type !== 0x80) return;
          // 两种包布局不同（实测验证）：
          //   type 00 实时：体重 data[3:6] = (data[3]-0x68)*65536 + data[4]*256 + data[5]
          //   type 02 锁定：体重 data[10:13] = 值 - 0x680000
          let weightKg: number;
          if (type === 0x00 || type === 0x80) {
            weightKg = Math.round((((data[3] - 0x68) * 65536 + data[4] * 256 + data[5]) / 1000.0) * 100) / 100;
          } else {
            const wRaw = (data[10] << 16) | (data[11] << 8) | data[12];
            weightKg = Math.round(((wRaw - 0x680000) / 1000.0) * 100) / 100;
          }
          // 实时包允许 0kg 回调（显示空秤/归零过程）；锁定包无重量则忽略
          if (weightKg < 0 || (type === 0x02 && weightKg <= 0)) return;
          const isLiveUnderWeight = weightKg < 30;
          // 测量开始计时（体重 > 5kg 才认为真正上秤）
          if (weightKg > 5 && measurementStartedAt === 0) measurementStartedAt = Date.now();
          // 充电时秤无法测量：45 秒仍未进入完成阶段 → 强制结束并提示超时
          let phaseOverride: MeasurePhase | null = null;
          if (measurementStartedAt > 0 && Date.now() - measurementStartedAt > 45000) {
            phaseOverride = 'done';
            pushDebug('测量超时（45s未完成），强制结束');
          }
          // 阻抗只取真实两组 data[4:6]/data[6:8]；data[8:10]=0x0180(384) 是固定标志位，不是阻抗
          const imp: number[] = type === 0x02
            ? [(data[4] << 8) | data[5], (data[6] << 8) | data[7]]
            : [];
          // 电极导通：真实阻抗至少一组 >0（排除恒定的 384 标志位）
          const electrodeOn = imp.some((v) => v > 0);
          pushDebug('收包 type=' + type + ' w=' + weightKg + ' imp=' + JSON.stringify(imp));
          // 电量：data[11] 低 7 位。待机时为真实电量(如10%)；测量中会变成 100(0x64) 作状态标志，需排除。
          // 只在 type 00 实时包且 data[11] != 0x64 时采信，取出现次数最多的稳定值。
          let battery: number | null = batteryStable;
          if (type === 0x00 && data.length > 11) {
            const raw = data[11] & 0x7F;
            if (raw > 0 && raw < 100) {
              batteryVotes.set(raw, (batteryVotes.get(raw) ?? 0) + 1);
              let best = batteryStable ?? 0, bestN = batteryVotes.get(best) ?? 0;
              batteryVotes.forEach((n: number, v: number) => { if (n > bestN) { bestN = n; best = v; } });
              batteryStable = best;
              battery = batteryStable;
            }
          }
          // 阶段：稳定包 data[11]=100(0x64) 表示进入阻抗测量；锁定包=完成
          const stateByte = data.length > 11 ? data[11] : 0;
          let phase: MeasurePhase = type === 0x02 ? 'done'
            : (type === 0x80 && stateByte >= 100) ? 'impedance'
            : 'weighing';
          if (phaseOverride) phase = phaseOverride;
          // 阶段变化时记录
          if (phase !== lastPhaseNotified) { lastPhaseNotified = phase; pushDebug('阶段: ' + phase); }
          onMeasurement({
            weight_kg: weightKg,
            impedance_1: imp.length > 0 && imp[0] > 0 ? imp[0] : null,
            impedance_2: imp.length > 1 && imp[1] > 0 ? imp[1] : null,
            battery,
            phase,
            timedOut: phaseOverride === 'done' && type !== 0x02,
            adcs: imp,
            electrode_on: electrodeOn,
            alg_type: data.length > 13 ? data[13] : null,
            locked: type === 0x02,
          });
        });

      onState('listening');
      pushDebug('监听中，等待测量');

      // 订阅已建立，现在才发命令（放前面秤推的数据会丢）
      // 1) 对时命令 08
      await writeCmd('对时08', mkFrame([0x08, (nowSec >>> 24) & 0xFF, (nowSec >>> 16) & 0xFF, (nowSec >>> 8) & 0xFF, nowSec & 0xFF, utcQuarters], 0xDF));
      // 2) 用户信息 01（weight: profile 参考体重 ×100）
      const profWeight = Math.min(0xFFFF, Math.round((profile.weightKg && profile.weightKg > 0 ? profile.weightKg : 60) * 100));
      await writeCmd('用户01', mkFrame([
        0x01, 0x00, 0x01, profile.height & 0xFF,
        (profWeight >> 8) & 0xFF, profWeight & 0xFF,
        profile.age & 0xFF, sexVal,
      ], 0xD1));
      // 3) 完整握手（时间+用户+目标+标志）
      const weightEnc = profWeight;
      const targetEnc = 6000;   // 60.00kg 目标
      await writeCmd('完整握手', mkFrame([
        (nowSec >>> 24) & 0xFF, (nowSec >>> 16) & 0xFF, (nowSec >>> 8) & 0xFF, nowSec & 0xFF,
        utcQuarters, 0x00, 0x01, profile.height & 0xFF,
        (weightEnc >> 8) & 0xFF, weightEnc & 0xFF,
        profile.age & 0xFF, sexVal,
        (targetEnc >> 8) & 0xFF, targetEnc & 0xFF,
        0x03, 0x00,
      ], 0xD0));
      // 4) 查询 06（设备静态配置块）
      await writeCmd('查询06', mkFrame([0x06], 0xDF));
      // 4.5) 开启 ADC 实时数据流（实测实时包 26→77，数字才能实时滚动）
      await writeCmd('开启ADC04d6', mkFrame([0x04, 0xD6], 0xDF));
      // 5) 04 d8 请求历史（握手完成秤已自动推，这里补 2 次确保拿全）
      await writeCmd('拉历史04d8#1', mkFrame([0x04, 0xD8], 0xDF));
      await writeCmd('拉历史04d8#2', mkFrame([0x04, 0xD8], 0xDF));


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

/**
 * 发送官方"解绑/重置用户配置"命令 (ac 27 02 ...)。
 * 来自 HCI 抓包：官方 App 在"解除绑定"操作时发送此帧，payload 含两组用户槽位配置。
 * 用于验证：清除秤内部绑定状态后，扫描是否恢复正常。
 */
export async function sendScaleUnbind(deviceId: string): Promise<boolean> {
  const m = getManager();
  try {
    // 若未连接则临时连接
    const connected = await m.isDeviceConnected(deviceId).catch(() => false);
    if (!connected) {
      await m.connectToDevice(deviceId, { timeout: 10000 });
      const dev = await m.devices([deviceId]);
      if (dev[0]) await dev[0].discoverAllServicesAndCharacteristics();
    }
    // 官方解绑帧：02 00 01 a8 1f 36 18 02 00 02 a8 1f 36 18 01 00，标识 d1
    const payload = [0x02, 0x00, 0x01, 0xA8, 0x1F, 0x36, 0x18, 0x02, 0x00, 0x02, 0xA8, 0x1F, 0x36, 0x18, 0x01, 0x00];
    const f = new Uint8Array(20);
    f[0] = 0xAC; f[1] = 0x27;
    payload.forEach((v, i) => { if (i + 2 < 18) f[2 + i] = v; });
    f[18] = 0xD1;
    let sum = 0;
    for (let i = 2; i < 19; i++) sum = (sum + f[i]) & 0xFF;
    f[19] = sum;
    const b64 = btoa(String.fromCharCode(...f));
    await m.writeCharacteristicWithoutResponseForDevice(deviceId, SERVICE_UUID, WRITE_UUID, b64);
    pushDebug('官方解绑命令已发送 ' + Array.from(f).map((x) => x.toString(16).padStart(2, '0')).join(' '));
    await new Promise((r) => setTimeout(r, 500));
    try { await m.cancelDeviceConnection(deviceId); } catch {}
    return true;
  } catch (e) {
    pushDebug('解绑命令失败: ' + (e instanceof Error ? e.message : String(e)));
    return false;
  }
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
