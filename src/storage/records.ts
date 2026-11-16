import { File, Directory, Paths } from 'expo-file-system';

/**
 * 本地记录层：把测量结果追加到 JSONL 文件（SDK 54 File/Directory API）。
 */

export interface MeasurementRecord {
  time: string;
  weight_kg: number;
  impedance_1: number | null;
  impedance_2: number | null;
  body_composition: Record<string, unknown> | null;
  profile: { sex: string; age: number; height: number };
}

function dataDir(): Directory {
  const dir = new Directory(Paths.document, 'afu_scale');
  if (!dir.exists) dir.create();
  return dir;
}

function dataFile(): File {
  return new File(dataDir(), 'afu_scale.jsonl');
}

export async function appendRecord(rec: MeasurementRecord): Promise<string> {
  const file = dataFile();
  const line = JSON.stringify(rec) + '\n';
  if (file.exists) {
    // 追加：读旧 + 写新（JSONL 小文件场景够用）
    const old = file.text();
    file.write(old + line);
  } else {
    file.write(line);
  }
  return file.uri;
}

export async function readRecords(): Promise<MeasurementRecord[]> {
  const file = dataFile();
  if (!file.exists) return [];
  try {
    const content = await file.text();
    return content.split('\n').filter((l: string) => l.trim().length > 0).map((l: string) => JSON.parse(l) as MeasurementRecord);
  } catch {
    return [];
  }
}

export async function getRecordCount(): Promise<number> {
  const recs = await readRecords();
  return recs.length;
}
