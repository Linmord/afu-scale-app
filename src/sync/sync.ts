import type { MeasurementRecord } from '../storage/records';
import { pushDebug } from '../ble/scaleBle';

/**
 * 同步层 v2：
 * - 所有网络请求带强制超时（避免 Promise 永久挂起卡死 UI）
 * - 每一步都写入调试日志
 */

export interface SyncConfig {
  url: string;
  enabled: boolean;
  timeoutMs?: number;
}

export interface SyncResult {
  ok: boolean;
  sent: number;
  error?: string;
  ms?: number;
}

const DEFAULT_TIMEOUT = 8000;

/** 带超时的 fetch：超时主动 abort，保证一定返回 */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    try { ctrl.abort(); } catch {}
  }, timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function errText(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === 'AbortError') return '请求超时（' + DEFAULT_TIMEOUT + 'ms 未响应）';
    return e.message || e.name;
  }
  return String(e);
}

/** POST 记录到电脑 */
export async function syncRecords(records: MeasurementRecord[], config: SyncConfig): Promise<SyncResult> {
  const t0 = Date.now();
  const timeout = config.timeoutMs ?? DEFAULT_TIMEOUT;

  if (!config.url) {
    pushDebug('[同步] 失败：未配置地址');
    return { ok: false, sent: 0, error: '未配置推送地址' };
  }
  if (records.length === 0) {
    pushDebug('[同步] 失败：没有选中记录');
    return { ok: false, sent: 0, error: '没有选中要推送的记录' };
  }

  const body = JSON.stringify({ records });
  pushDebug(`[同步] POST ${config.url} 共 ${records.length} 条, ${(body.length / 1024).toFixed(1)}KB`);

  try {
    const resp = await fetchWithTimeout(
      config.url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
      timeout,
    );
    const ms = Date.now() - t0;
    pushDebug(`[同步] HTTP ${resp.status} (${ms}ms)`);

    if (!resp.ok) {
      return { ok: false, sent: 0, error: 'HTTP ' + resp.status, ms };
    }
    const data = (await resp.json().catch(() => ({}))) as { received?: number };
    const sent = data.received ?? records.length;
    pushDebug(`[同步] 成功，服务端接收 ${sent} 条`);
    return { ok: true, sent, ms };
  } catch (e) {
    const ms = Date.now() - t0;
    const msg = errText(e);
    pushDebug(`[同步] 异常 (${ms}ms): ${msg}`);
    return { ok: false, sent: 0, error: msg, ms };
  }
}

/** 测试连通性（GET /ping） */
export async function testConnection(url: string, timeoutMs = DEFAULT_TIMEOUT): Promise<{ ok: boolean; detail: string; ms: number }> {
  if (!url) return { ok: false, detail: '未配置推送地址', ms: 0 };
  const pingUrl = url.replace(/\/records$/, '/ping');
  const t0 = Date.now();
  pushDebug('[连通] GET ' + pingUrl);

  try {
    const resp = await fetchWithTimeout(pingUrl, { method: 'GET' }, timeoutMs);
    const ms = Date.now() - t0;
    pushDebug(`[连通] HTTP ${resp.status} (${ms}ms)`);
    if (resp.ok) return { ok: true, detail: 'HTTP ' + resp.status, ms };
    return { ok: false, detail: 'HTTP ' + resp.status + '（服务在但返回异常）', ms };
  } catch (e) {
    const ms = Date.now() - t0;
    const msg = errText(e);
    pushDebug(`[连通] 异常 (${ms}ms): ${msg}`);
    if (msg.includes('超时')) {
      return { ok: false, detail: '请求超时：手机没连到这个 IP，或电脑服务未监听（' + ms + 'ms）', ms };
    }
    if (msg.includes('Network request failed') || msg.includes('Failed to fetch') || msg.includes('Unable to resolve')) {
      return { ok: false, detail: '网络层拒绝：检查手机与电脑是否同一 WiFi、防火墙是否放行', ms };
    }
    return { ok: false, detail: msg, ms };
  }
}


/** 从电脑端拉取远端已有记录 */
export async function fetchRemoteRecords(url: string, timeoutMs = DEFAULT_TIMEOUT): Promise<{ ok: boolean; records: MeasurementRecord[]; error?: string; ms?: number }> {
  const t0 = Date.now();
  const getUrl = url.replace(/\/records$/, '/records');
  pushDebug('[拉取] GET ' + getUrl);
  try {
    const resp = await fetchWithTimeout(getUrl, { method: 'GET' }, timeoutMs);
    const ms = Date.now() - t0;
    if (!resp.ok) {
      pushDebug('[拉取] HTTP ' + resp.status);
      return { ok: false, records: [], error: 'HTTP ' + resp.status, ms };
    }
    const data = (await resp.json()) as { records?: MeasurementRecord[] };
    const records = Array.isArray(data.records) ? data.records : [];
    pushDebug('[拉取] 成功 ' + records.length + ' 条 (' + ms + 'ms)');
    return { ok: true, records, ms };
  } catch (e) {
    const ms = Date.now() - t0;
    const msg = errText(e);
    pushDebug('[拉取] 异常 (' + ms + 'ms): ' + msg);
    return { ok: false, records: [], error: msg, ms };
  }
}
