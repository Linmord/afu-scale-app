/**
 * Scale27 协议解析 —— 从 Python afu_welland_scale/protocol.py 移植。
 * 纯位运算/数学，无平台依赖。
 */

export type Stage = { stage: string; minutes: number };

export interface WeightFields {
  weight_kg: number;
  weight_g: number;
  has_temperature: boolean;
  state: boolean;
  dianji: boolean;
  supportHr: boolean;
  supportPh: boolean;
  supportZx: boolean;
  precision_kg: number;
  kg_scale_division: number;
  lb_scale_division: number;
}

// 包类型
export const PACKET_WEIGHT = 213;
export const PACKET_ADC = 214;
export const PACKET_HISTORY = 216;
export const PACKET_SETTING = 223;

function getBit(value: number, bit: number): number {
  return value & (1 << bit) ? 1 : 0;
}

function u16(data: Uint8Array, offset: number): number {
  return ((data[offset] << 8) | data[offset + 1]) >>> 0;
}

/** 通用单位换算，division 控制舍入方式 */
function gUnitGeneral(value: number, division: number, precision: number): number {
  const getInt = (v: number): number => {
    const r = Math.floor(v * 10.0);
    return r % 10 >= 9 ? Math.floor(v) + 1 : Math.floor(v);
  };
  if (division === 0) {
    const scaled = Math.floor((getInt(value * 1000.0) + 5) / 10.0);
    return scaled / 100.0;
  }
  if (division === 1) {
    let raw = getInt(value * 1000.0);
    if (raw % 10 === 9) raw += 10;
    let scaled = Math.floor(raw / 10.0);
    if (scaled % 2) scaled += 1;
    return scaled / 100.0;
  }
  if (division === 2) {
    const raw = Math.floor((getInt(value * 1000.0) + 20) / 10.0);
    const scaled = raw % 10 >= 5 ? Math.floor(raw / 10) * 10 + 5 : Math.floor(raw / 10) * 10;
    return scaled / 100.0;
  }
  if (division === 3) {
    const scaled = Math.floor((getInt(value * 100.0) + 5) / 10.0);
    return scaled / 10.0;
  }
  if (division === 4) {
    let raw = getInt(value * 100.0);
    if (raw % 10 === 9) raw += 10;
    let scaled = Math.floor(raw / 10.0);
    if (scaled % 2) scaled += 1;
    return scaled / 10.0;
  }
  return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
}

export function g2kgGeneral(grams: number, division: number, precision: number): number {
  return gUnitGeneral(grams / 1000.0, division, precision);
}

/** 从 encoded 体重位字段解析体重 */
export function weightFields(encoded: number): WeightFields {
  const grams = encoded & 0x3ffff;
  const kgDivision = (encoded & 0x1c0000) >> 18;
  const lbDivision = (encoded & 0xe00000) >> 21;
  const precisionKg = kgDivision === 0 || kgDivision === 1 || kgDivision === 2 ? 2 : 1;
  return {
    weight_kg: g2kgGeneral(grams, kgDivision, precisionKg),
    weight_g: grams,
    has_temperature: getBit(encoded, 28) === 1,
    state: getBit(encoded, 31) === 1,
    dianji: getBit(encoded, 24) === 1,
    supportHr: getBit(encoded, 25) === 1,
    supportPh: getBit(encoded, 26) === 1,
    supportZx: getBit(encoded, 27) === 1,
    precision_kg: precisionKg,
    kg_scale_division: kgDivision,
    lb_scale_division: lbDivision,
  };
}

/** 归一化阻抗/ADC 序列 */
export function normalizeImpedances(adcs: number[], weightKg: number | null): number[] {
  if (adcs.length === 5) {
    return [adcs[4], adcs[0], adcs[1], adcs[2], adcs[3]].map((v) => Math.round(v * 100) / 100);
  }
  const out: number[] = [];
  const weight = weightKg || 0;
  for (const value of adcs) {
    let adjusted = value;
    if (adjusted >= 1500.0 && weight > 0) {
      adjusted = (((adjusted - 1000.0) + weight * 10.0 * -0.4) / 0.6) / 10.0;
    }
    out.push(Math.round(adjusted * 100) / 100);
  }
  return out;
}

export interface FeedResult {
  status: 'imperfect' | 'perfect' | 'error' | 'verify_error';
  frame: Uint8Array | null;
  events: MeasEvent[];
}

export interface MeasEvent {
  packet_type: number;
  weight_kg?: number;
  weight?: WeightFields;
  impendences?: number[];
  adcs?: number[];
  time?: number;
  [k: string]: unknown;
}

/** 组包 + 解码。把收到的 notify 字节喂进来，返回解析出的事件。 */
export class Scale27Protocol {
  private packets: Uint8Array[] = [];

  feed(data: Uint8Array): FeedResult {
    this.packets.push(data);
    const { status, frame } = this.assemble(this.packets);
    if (status === 'perfect' || status === 'error' || status === 'verify_error') {
      this.packets = [];
    }
    if (status !== 'perfect' || !frame) {
      return { status, frame, events: [] };
    }
    return { status, frame, events: this.decode(frame) };
  }

  private assemble(packets: Uint8Array[]): { status: FeedResult['status']; frame: Uint8Array | null } {
    if (!packets.length) return { status: 'imperfect', frame: null };
    const first = packets[0];
    if (first.length < 20) return { status: 'imperfect', frame: null };

    const seqOrFlags = first[1] & 0xff;
    if (getBit(seqOrFlags, 7)) return { status: 'error', frame: null };

    const body18 = first.slice(2, 20);
    const checksum = body18.slice(0, 17).reduce((a, b) => a + b, 0) & 0x1f;
    const checksumByte = body18[17];
    const status: FeedResult['status'] = checksum === (checksumByte & 0x1f) ? 'perfect' : 'verify_error';
    const packetType = body18[16];
    const groupIndex = (checksumByte & 0xe0) >> 5;

    // 简化：SETTING 多包组包路径对读取体脂场景非必需，跳过多包合并
    // 这里返回首包帧，供 decode 使用
    return { status, frame: first };
  }

  private decode(frame: Uint8Array): MeasEvent[] {
    if (frame.length < 20) return [];
    const events: MeasEvent[] = [];
    // 解析体重包：body18[16] 是包类型
    const body18 = frame.slice(2, 20);
    const packetType = body18[16];
    if (packetType === PACKET_WEIGHT || packetType === PACKET_ADC) {
      // 体重字段：尝试从 body 中提取 encoded 值
      const encoded = u16(body18, 0) | (u16(body18, 2) << 16) | (body18[4] << 24);
      const w = weightFields(encoded >>> 0);
      if (w.weight_kg > 0) {
        events.push({ packet_type: packetType, weight_kg: w.weight_kg, weight: w });
      }
    }
    return events;
  }
}
