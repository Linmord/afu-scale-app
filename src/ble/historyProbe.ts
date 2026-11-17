import { BleManager } from 'react-native-ble-plx';
import { NOTIFY_UUID, WRITE_UUID, SERVICE_UUID, pushDebug } from './scaleBle';
import { encodeTimeAndUserInfo27, decodeHistoryPacket, type HistoryEvent, type UserInfo27 } from '../protocol/history27';

/**
 * 历史同步探测会话：连接 → 写时间+用户命令 → 持续监听 → 收集 216 历史包 + 全部原始包。
 * 用于实验确认「秤补推历史」机制并采集日志。
 */
export interface ProbeEvent {
  ts: number;
  type: 'raw' | 'history' | 'state';
  hex?: string;
  history?: HistoryEvent;
  msg?: string;
}

export interface ProbeSession { stop: () => void }

export async function startHistoryProbe(
  deviceId: string,
  user: UserInfo27,
  onEvent: (e: ProbeEvent) => void,
  onState: (s: 'connecting' | 'listening' | 'error', detail?: string) => void,
  durationMs = 90000,
): Promise<ProbeSession> {
  const m = new BleManager();
  let stopped = false;
  let sub: { remove: () => void } | null = null;
  const session: ProbeSession = {
    stop: () => {
      if (stopped) return;
      stopped = true;
      try { sub?.remove(); } catch {}
      try { m.cancelDeviceConnection(deviceId).catch(() => {}); } catch {}
      onState('error', 'stopped');
    },
  };

  onState('connecting');
  try {
    const dev = await m.connectToDevice(deviceId, { timeout: 15000 });
    if (stopped) return session;
    await (dev as unknown as { getServices?: () => Promise<unknown> }).getServices?.() ?? (dev as unknown as { discoverAllServicesAndCharacteristics?: () => Promise<unknown> }).discoverAllServicesAndCharacteristics?.();
    pushDebug('[probe] connected');

    // 写时间+用户命令（关键握手）
    const cmd = encodeTimeAndUserInfo27(user);
    let b64 = '';
    for (let i = 0; i < cmd.length; i += 1) b64 += String.fromCharCode(cmd[i]);
    // RN 环境用 base64：手动实现
    const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let out = '';
    for (let i = 0; i < cmd.length; i += 3) {
      const b0 = cmd[i], b1 = cmd[i+1], b2 = cmd[i+2];
      out += B64[b0 >> 2];
      out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
      out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
      out += b2 === undefined ? '=' : B64[b2 & 63];
    }
    b64 = out;
    onEvent({ ts: Date.now(), type: 'state', msg: 'cmd=' + Array.from(cmd).map(x => x.toString(16).padStart(2,'0')).join(' ') });
    await m.writeCharacteristicWithoutResponseForDevice(deviceId, SERVICE_UUID, WRITE_UUID, b64);
    pushDebug('[probe] time+user cmd written');
    onState('listening');

    sub = m.monitorCharacteristicForDevice(deviceId, SERVICE_UUID, NOTIFY_UUID,
      (error, ch) => {
        if (stopped) return;
        if (error || !ch?.value) return;
        // base64 decode
        const bin = atob(ch.value);
        const data = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
        const hex = Array.from(data).map(x => x.toString(16).padStart(2, '0')).join(' ');
        onEvent({ ts: Date.now(), type: 'raw', hex });
        const hist = decodeHistoryPacket(data);
        for (const h of hist) onEvent({ ts: Date.now(), type: 'history', history: h, hex });
      });

    setTimeout(() => {
      if (stopped) return;
      stopped = true;
      try { sub?.remove(); } catch {}
      try { m.cancelDeviceConnection(deviceId).catch(() => {}); } catch {}
      onState('error', 'probe finished');
    }, durationMs);
  } catch (e) {
    onState('error', e instanceof Error ? e.message : String(e));
  }
  return session;
}
