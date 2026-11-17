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
  for (const ev of events) {
    if (!ev.time || ev.weight_kg === null || ev.weight_kg <= 0) { skipped++; continue; }
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
      impedance_1: ev.adcs[0] ?? null,
      impedance_2: ev.adcs[1] ?? null,
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
  const stamp = remoteStamp || new Date().toISOString().slice(0, 19).replace('T', ' ');
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
  const stamp = when || new Date().toISOString().slice(0, 19).replace('T', ' ');
  let changed = false;
  for (const r of list) {
    if (ids.includes(r.id) && !r.syncedAt) { r.syncedAt = stamp; changed = true; }
  }
  if (changed) await writeRecords(list);
  return list;
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
