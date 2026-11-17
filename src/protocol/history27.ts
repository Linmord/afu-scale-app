/**
 * Scale27 时间/用户命令编码 + 历史包(216)解码 —— 从 Mzdyl/ant-afu-welland-scale 移植。
 */

export interface UserInfo27 { unit: number; height: number; age: number; sex: 'male' | 'female' }

function setBit(v: number, bit: number): number { return v | (1 << bit); }

function float2int(value: number, precision: number): number {
  const factor = 10 ** (precision + 1);
  let scaled = Math.trunc(value * factor);
  if (value * factor - scaled >= 0.8) scaled += 10;
  return Math.trunc(scaled / 10);
}

function localUtcOffsetQuarters(): number {
  const offsetMin = -new Date().getTimezoneOffset();
  return Math.trunc((offsetMin * 60) / 900) & 0xFF;
}

/** 编码「时间 + 用户信息」命令（触发历史上传的关键握手） */
export function encodeTimeAndUserInfo27(user: UserInfo27, nowSec?: number): Uint8Array {
  const now = nowSec ?? Math.trunc(Date.now() / 1000);
  const utcQuarters = localUtcOffsetQuarters();
  const userIndex = 1;
  const profileWeight = 0.0;
  const targetWeight = 0.0;
  const sexValue = user.sex === 'male' ? 1 : 2;

  const weight = float2int(profileWeight, 2);
  const target = float2int(targetWeight, 2);
  const functionFlags = setBit(setBit(0, 0), 1);

  const p = new Uint8Array(19);
  let o = 0;
  p[o++] = 0xAC;
  p[o++] = 2;                       // device_type = fat scale
  const ts = new DataView(new ArrayBuffer(4));
  ts.setUint32(0, now);
  p.set(new Uint8Array(ts.buffer), o); o += 4;   // 4B 时间戳
  p[o++] = utcQuarters;
  p[o++] = user.unit & 0xFF;
  p[o++] = userIndex;
  p[o++] = user.height & 0xFF;
  const w = new DataView(new ArrayBuffer(2)); w.setUint16(0, weight);
  p.set(new Uint8Array(w.buffer), o); o += 2;
  p[o++] = user.age & 0xFF;
  p[o++] = sexValue;
  const t = new DataView(new ArrayBuffer(2)); t.setUint16(0, target);
  p.set(new Uint8Array(t.buffer), o); o += 2;
  p[o++] = functionFlags & 0xFF;
  p[o++] = 0;
  p[o++] = 0xD0;
  // 补齐到 19 字节 + 校验和
  while (o < 19) p[o++] = 0;
  let sum = 0;
  for (let i = 2; i < 19; i++) sum = (sum + p[i]) & 0xFF;
  const out = new Uint8Array(20);
  out.set(p.subarray(0, 19));
  out[19] = sum;
  return out;
}

// ---------- 历史包(216) 解码 ----------

export interface HistoryEvent {
  kind: 'history';
  history_type: number;
  time: number;                 // unix 秒
  weight_kg: number | null;
  weight_raw_g: number | null;
  adcs: number[];
  hr: number | null;
  remainHistoryCount: number | null;
  alg_type: number | null;
  unit_code: number | null;
  device_type: number;
}

function u16(d: Uint8Array, o: number): number { return (d[o] << 8) | d[o + 1]; }
function u32(d: Uint8Array, o: number): number { return ((d[o] << 24) | (d[o+1] << 16) | (d[o+2] << 8) | d[o+3]) >>> 0; }

/** 体重位字段（编码时含精度/分度） */
function weightFromEncoded(encoded: number): { kg: number | null; grams: number | null } {
  const grams = encoded & 0x3FFFF;
  const kgDiv = (encoded & 0x1C0000) >> 18;
  // Mzdyl g2kg_general 简化：division 0-2 → /100（50g 分度）；3-4 → /10
  let kg: number;
  if (kgDiv <= 2) kg = grams / 100.0;
  else kg = grams / 10.0;
  return { kg: Math.round(kg * 100) / 100, grams };
}

/** 从一个 20 字节通知包解码历史事件（若 type=216） */
export function decodeHistoryPacket(data: Uint8Array): HistoryEvent[] {
  // 组包规则（python）：body18 = data[2:20]，packet_type = body18[16]
  if (data.length < 20) return [];
  const packetType = data[18];    // body18[16] = data[18]
  if (packetType !== 216) return [];

  const events: HistoryEvent[] = [];
  // python _decode_history 从 frame 起始解析，但 frame 含 head。按 python：
  // 传入的 payload 是完整 frame（20B），device_type = payload[0]
  const dt = data[0];
  if (dt !== 42) {
    const historyType = data[1];
    const time = u32(data, 2);
    const wEnc = u32(data, 6);
    const w = weightFromEncoded(wEnc);
    const adcs: number[] = [];
    let hr: number | null = null;
    let remain: number | null = null;
    let o = 10;
    if (historyType === 0 && o + 4 <= 20) {
      o += 2;
      hr = data[o]; o += 1;
      const count = data[o]; o += 1;
      for (let i = 0; i < count && o + 2 <= 20; i++) { adcs.push(u16(data, o)); o += 2; }
    } else if (historyType === 2 && o + 2 <= 20) {
      remain = data[o]; o += 1;
      const count = data[o]; o += 1;
      for (let i = 0; i < count && o + 2 <= 20; i++) { adcs.push(u16(data, o)); o += 2; }
      hr = 0;
    } else {
      for (let i = 0; i < 2 && o + 2 <= 20; i++) { adcs.push(u16(data, o)); o += 2; }
      o += 2;
    }
    let algType: number | null = null;
    let unitCode: number | null = null;
    if (o + 2 <= 20) { algType = data[o]; unitCode = data[o + 1]; }
    events.push({
      kind: 'history', history_type: historyType, time,
      weight_kg: w.kg, weight_raw_g: w.grams,
      adcs, hr, remainHistoryCount: remain, alg_type: algType, unit_code: unitCode,
      device_type: dt,
    });
  } else {
    // device_type 42 变体
    if (20 < 14) return [];
    const time = u32(data, 1);
    const wEnc = u32(data, 5);
    const w = weightFromEncoded(wEnc);
    const adcs = [u16(data, 9)];
    events.push({
      kind: 'history', history_type: -1, time,
      weight_kg: w.kg, weight_raw_g: w.grams,
      adcs, hr: null, remainHistoryCount: null, alg_type: null, unit_code: null,
      device_type: dt,
    });
  }
  return events;
}
