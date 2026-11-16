import * as FileSystem from 'expo-file-system';
import type { MeasurementRecord } from '../storage/records';

/**
 * 同步层：把本地记录 POST 到电脑的接收服务。
 * 电脑端用现有 Python 环境写一个常驻 HTTP 服务。
 */

export interface SyncConfig {
  url: string; // 例如 http://192.168.1.10:8765/records
  enabled: boolean;
}

export interface SyncResult {
  ok: boolean;
  sent: number;
  error?: string;
}

/**
 * 把所有未同步记录发送到电脑。
 * 为简化，每次都把全部本地记录 POST 一次；电脑端按时间戳去重。
 */
export async function syncRecords(records: MeasurementRecord[], config: SyncConfig): Promise<SyncResult> {
  if (!config.enabled || !config.url) {
    return { ok: false, sent: 0, error: '同步未启用或未配置地址' };
  }
  try {
    const body = JSON.stringify({ records });
    const resp = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!resp.ok) {
      return { ok: false, sent: 0, error: 'HTTP ' + resp.status };
    }
    const data = (await resp.json().catch(() => ({}))) as { received?: number };
    return { ok: true, sent: data.received ?? records.length };
  } catch (e) {
    return { ok: false, sent: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 测试电脑端连通性 */
export async function testConnection(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url.replace(/\/records$/, '/ping'), { method: 'GET' });
    return resp.ok;
  } catch {
    return false;
  }
}
