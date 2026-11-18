import { File, Directory, Paths } from 'expo-file-system';

/**
 * 本地记录层 v3：
 * - 默认单位「小林」
 * - 记录含电极/阻抗等诊断字段
 * - 支持删除单条记录
 */

export interface MeasurementRecord {
  id: string;                 // 唯一 id（时间戳+随机）
  time: string;
  unit: string;
  weight_kg: number;
  impedance_1: number | null;
  impedance_2: number | null;
  adcs?: number[] | null;     // 多频阻抗原始值
  electrode_on?: boolean;     // 电极是否导通
  alg_type?: number | null;
  syncedAt?: string | null;   // 已推送到电脑的时间（null/undefined = 未推送）
  body_composition: Record<string, unknown> | null;
  profile: { sex: string; age: number; height: number };
}

const UNITS_KEY_FILE = 'units.json';

/** 本地时间字符串（YYYY-MM-DD HH:MM:SS）——必须用本地时区，不能用 toISOString（UTC） */
export function localTimeString(d: Date = new Date()): string {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
    + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');
}
export const DEFAULT_UNIT = '小林';

function dataDir(): Directory {
  const dir = new Directory(Paths.document, 'afu_scale');
  if (!dir.exists) dir.create();
  return dir;
}
function dataFile(): File { return new File(dataDir(), 'afu_scale.jsonl'); }
function unitsFile(): File { return new File(dataDir(), UNITS_KEY_FILE); }

export function newRecordId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function appendRecord(rec: MeasurementRecord): Promise<string> {
  const file = dataFile();
  const line = JSON.stringify(rec) + '\n';
  try {
    if (file.exists) {
      const old = await file.text();
      file.write(old + line);
    } else {
      file.write(line);
    }
    return file.uri;
  } catch (e) {
    console.warn('appendRecord failed:', e);
    throw e;
  }
}

export async function readRecords(): Promise<MeasurementRecord[]> {
  const file = dataFile();
  if (!file.exists) return [];
  try {
    const content = await file.text();
    return content.split('\n').filter((l: string) => l.trim().length > 0)
      .map((l: string) => {
        const o = JSON.parse(l) as MeasurementRecord;
        if (!o.id) o.id = newRecordId();
        return o;
      });
  } catch (e) {
    console.warn('readRecords failed:', e);
    return [];
  }
}

export async function writeRecords(list: MeasurementRecord[]): Promise<void> {
  const file = dataFile();
  const body = list.map((r) => JSON.stringify(r)).join('\n') + (list.length ? '\n' : '');
  file.write(body);
}

/** 删除单条记录 */
export async function deleteRecord(id: string): Promise<MeasurementRecord[]> {
  const list = await readRecords();
  const next = list.filter((r) => r.id !== id);
  await writeRecords(next);
  return next;
}

/** 秤端历史包入库：按 time 秒级去重（同一测量重发多次只存一条） */
export async function importHistoryEvents(
  events: { time: number; weight_kg: number | null; adcs: number[]; hr: number | null }[],
  unit: string,
  profile: { sex: string; age: number; height: number },
): Promise<{ added: number; skipped: number; list: MeasurementRecord[] }> {
  const list = await readRecords();
  const timeKeys = new Set(list.map((r) => r.time));
  let added = 0;
  let skipped = 0;
  const MIN_VALID_KG = 30;   // 成人体重下限：低于此值多为轻踩/单脚的无效记录
  for (const ev of events) {
    if (!ev.time || ev.weight_kg === null || ev.weight_kg <= 0) { skipped++; continue; }
    if (ev.weight_kg < MIN_VALID_KG) { skipped++; continue; }   // 丢弃轻踩垃圾数据
    const d = new Date(ev.time * 1000);
    const time = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
      + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');
    if (timeKeys.has(time)) { skipped++; continue; }
    timeKeys.add(time);
    list.push({
      id: newRecordId(),
      time,
      unit,
      weight_kg: ev.weight_kg,
      impedance_1: (ev.adcs[0] ?? 0) > 0 ? ev.adcs[0] : null,
      impedance_2: (ev.adcs[1] ?? 0) > 0 ? ev.adcs[1] : null,
      adcs: ev.adcs,
      electrode_on: ev.adcs.some((v) => v > 0),
      body_composition: null,   // 历史补录的体脂由 UI 按需估算，不在此强算
      profile,
    });
    added++;
  }
  if (added > 0) await writeRecords(list);
  return { added, skipped, list };
}

/** 合并远端记录到本地（按 id 去重，远端已有的标记为已推送） */
export async function mergeRemoteRecords(remote: MeasurementRecord[], remoteStamp?: string): Promise<{ added: number; marked: number; list: MeasurementRecord[] }> {
  const local = await readRecords();
  const localIds = new Set(local.map((r) => r.id));
  const stamp = remoteStamp || localTimeString();
  let added = 0;
  let marked = 0;

  // 远端有、本地没有 → 加进本地并标记已推送
  for (const r of remote) {
    if (!r.id) continue;
    if (!localIds.has(r.id)) {
      local.push({ ...r, syncedAt: r.syncedAt || stamp });
      localIds.add(r.id);
      added += 1;
    } else {
      // 本地已有但未标记 → 标记为已推送
      const hit = local.find((x) => x.id === r.id);
      if (hit && !hit.syncedAt) { hit.syncedAt = stamp; marked += 1; }
    }
  }
  if (added > 0 || marked > 0) await writeRecords(local);
  return { added, marked, list: local };
}

/** 把指定 id 标记为已推送 */
export async function markRecordsSynced(ids: string[], when?: string): Promise<MeasurementRecord[]> {
  const list = await readRecords();
  const stamp = when || localTimeString();
  let changed = false;
  for (const r of list) {
    if (ids.includes(r.id) && !r.syncedAt) { r.syncedAt = stamp; changed = true; }
  }
  if (changed) await writeRecords(list);
  return list;
}

export async function deleteRecords(ids: string[]): Promise<MeasurementRecord[]> {
  const set = new Set(ids);
  const list = await readRecords();
  const next = list.filter((r) => !set.has(r.id));
  if (next.length !== list.length) await writeRecords(next);
  return next;
}

/** 把记录转移给其他所有者（同时更新记录里的 profile 为当前用户档案） */
export async function transferRecords(
  ids: string[],
  newUnit: string,
  profile: { sex: string; age: number; height: number },
): Promise<MeasurementRecord[]> {
  const set = new Set(ids);
  const list = await readRecords();
  let changed = false;
  for (const r of list) {
    if (set.has(r.id)) {
      r.unit = newUnit;
      r.profile = { ...profile };
      // 转移所有者后体成分应重算，这里清空避免沿用旧主人的 BIA 结果
      r.body_composition = null;
      changed = true;
    }
  }
  if (changed) await writeRecords(list);
  return list;
}

/**
 * 按每条记录自身的 profile（性别/年龄/身高）重新计算体脂。
 * 用于修正早期用错公式/错性别的旧记录。calc 由调用方注入，避免 storage 依赖 protocol。
 */
export async function recalcBodyComposition(
  calc: (r: MeasurementRecord) => Record<string, unknown> | null,
): Promise<number> {
  const list = await readRecords();
  let changed = 0;
  for (const r of list) {
    const next = calc(r);
    const before = JSON.stringify(r.body_composition);
    if (JSON.stringify(next) !== before) {
      r.body_composition = next;
      changed++;
    }
  }
  if (changed > 0) await writeRecords(list);
  return changed;
}

export async function getRecordCount(): Promise<number> {
  return (await readRecords()).length;
}

// ---------- 单位（用户）管理 ----------
export async function readUnits(): Promise<string[]> {
  const f = unitsFile();
  try {
    if (!f.exists) return [DEFAULT_UNIT];
    const arr = JSON.parse(await f.text()) as string[];
    return arr.length ? arr : [DEFAULT_UNIT];
  } catch { return [DEFAULT_UNIT]; }
}

export async function writeUnits(units: string[]): Promise<void> {
  const f = unitsFile();
  f.write(JSON.stringify(units));
}

export async function addUnit(name: string): Promise<string[]> {
  const units = await readUnits();
  if (!units.includes(name)) units.push(name);
  await writeUnits(units);
  return units;
}

export async function removeUnit(name: string): Promise<string[]> {
  let units = await readUnits();
  units = units.filter((u) => u !== name);
  if (!units.length) units = [DEFAULT_UNIT];
  await writeUnits(units);
  return units;
}
