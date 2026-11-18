import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 显示单位偏好：数据库永远以 kg 存储，仅在显示层换算。
 * unitCode 对应秤协议：0=kg, 1=lb, 3=斤（写命令时使用）。
 */
export type DisplayUnit = 'kg' | 'lb' | 'jin';

export const UNIT_CODES: Record<DisplayUnit, number> = { kg: 0, lb: 1, jin: 3 };
export const UNIT_LABELS: Record<DisplayUnit, string> = {
  kg: 'kg（公斤）',
  lb: 'lb（磅）',
  jin: '斤',
};

const KEY = 'afu_display_unit';

export async function getDisplayUnit(): Promise<DisplayUnit> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v === 'kg' || v === 'lb' || v === 'jin') return v;
  } catch {}
  return 'kg';
}

export async function setDisplayUnit(u: DisplayUnit): Promise<void> {
  try { await AsyncStorage.setItem(KEY, u); } catch {}
}

/** kg → 目标单位数值（四舍五入到合适精度） */
export function kgTo(valueKg: number, unit: DisplayUnit): number {
  // 保留 2 位小数：秤原始数据是克级（如 80.15kg），不能砍成 1 位
  if (unit === 'lb') return Math.round(valueKg * 2.2046226 * 100) / 100;
  if (unit === 'jin') return Math.round(valueKg * 2 * 100) / 100;
  return Math.round(valueKg * 100) / 100;
}

/** 统一显示格式：统一两位小数（80.30 kg / 160.60 斤），不补前导零 */
export function formatWeight(valueKg: number, unit: DisplayUnit): string {
  return kgTo(valueKg, unit).toFixed(2);
}

export function unitLabel(unit: DisplayUnit): string {
  return unit === 'lb' ? 'lb' : unit === 'jin' ? '斤' : 'kg';
}
