import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  startContinuousScan, stopScan, startMeasureSession, stopMeasureSession,
  getDebugLogs, getScanStats, clearDebugLogs,
  type MeasurementResult, type UserProfile, type ScannedDeviceInfo, type MeasureSession,
} from './src/ble/scaleBle';
import { getDevices, addDevice, removeDevice, renameDevice, type BoundDevice } from './src/storage/devices';
import {
  appendRecord, readRecords, readUnits, addUnit, removeUnit, deleteRecord,
  newRecordId, markRecordsSynced, mergeRemoteRecords, DEFAULT_UNIT, type MeasurementRecord,
} from './src/storage/records';
import { estimateBodyComposition } from './src/protocol/bodycomp';
import { getGoals, setGoal, type GoalMap } from './src/storage/goals';
import { syncRecords, testConnection, fetchRemoteRecords, type SyncConfig } from './src/sync/sync';
import { ConnectPage } from './src/ui/ConnectPage';
import { ensureBlePermissions, promptOpenSettings } from './src/ble/permissions';
import { DevicePage } from './src/ui/DevicePage';
import { DataPage } from './src/ui/DataPage';
import { SettingsPage } from './src/ui/SettingsPage';
import { C } from './src/ui/theme';

const DEFAULT_PROFILE = { age: 24, sex: 'female' as const, height: 168, unit: 'kg' };
type Tab = 'connect' | 'data' | 'settings';
type ConnState = 'idle' | 'connecting' | 'listening' | 'error';

export default function App() {
  const [tab, setTab] = useState<Tab>('connect');
  const [devices, setDevices] = useState<BoundDevice[]>([]);
  const [openDevice, setOpenDevice] = useState<BoundDevice | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState<ScannedDeviceInfo[]>([]);
  const [connState, setConnState] = useState<ConnState>('idle');
  const [connDetail, setConnDetail] = useState<string>('');
  const [latest, setLatest] = useState<MeasurementResult | null>(null);
  const [records, setRecords] = useState<MeasurementRecord[]>([]);
  const [units, setUnits] = useState<string[]>([DEFAULT_UNIT]);
  const [goals, setGoals] = useState<GoalMap>({});
  const [syncUrl, setSyncUrl] = useState('http://192.168.1.5:8765/records');
  const URL_KEY = 'afu_sync_url';
  const [syncMsg, setSyncMsg] = useState('');       // 数据页推送结果
  const [testMsg, setTestMsg] = useState('');       // 设置页测试结果
  const [remoteMsg, setRemoteMsg] = useState('');   // 拉取远端结果
  const [syncing, setSyncing] = useState(false);
  const [dbgLogs, setDbgLogs] = useState('');
  const [permDenied, setPermDenied] = useState(false);

  const sessionRef = useRef<MeasureSession | null>(null);

  const stopScanRef = useRef<(() => void) | null>(null);

  const refreshAll = useCallback(async () => {
    setDevices(await getDevices());
    setRecords(await readRecords());
    setUnits(await readUnits());
    setGoals(await getGoals());
  }, []);

  // 启动时恢复上次保存的推送地址
  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const saved = await AsyncStorage.getItem(URL_KEY);
        if (saved) setSyncUrl(saved);
      } catch {}
    })();
  }, []);

  // 地址变更时持久化
  const updateSyncUrl = useCallback((u: string) => {
    setSyncUrl(u);
    import('@react-native-async-storage/async-storage')
      .then((m) => m.default.setItem(URL_KEY, u))
      .catch(() => {});
  }, []);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  /** 请求蓝牙权限（首次启动 + 用户点按钮时） */
  const requestPerms = useCallback(async (): Promise<boolean> => {
    const r = await ensureBlePermissions();
    setPermDenied(!r.ok);
    if (!r.ok) promptOpenSettings(r.denied);
    return r.ok;
  }, []);

  // 首次启动即请求权限（关键修复：否则第一次扫描永远扫不到）
  useEffect(() => { void requestPerms(); }, [requestPerms]);

  // 关闭测量会话
  const closeSession = useCallback(() => {
    if (sessionRef.current) { sessionRef.current.stop(); sessionRef.current = null; }
    stopMeasureSession();
    setConnState('idle');
    setConnDetail('');
    setLatest(null);
  }, []);

  // 打开某台设备 → 建立持久测量会话
  const handleOpenDevice = useCallback(async (dev: BoundDevice) => {
    await requestPerms();
    setOpenDevice(dev);
    setTab('connect');
    setLatest(null);
    // 停掉扫描，避免与连接冲突
    if (stopScanRef.current) { stopScanRef.current(); stopScanRef.current = null; setScanning(false); }
    if (sessionRef.current) { sessionRef.current.stop(); sessionRef.current = null; }

    const session = await startMeasureSession(
      dev.id,
      { ...DEFAULT_PROFILE } as UserProfile,
      (r) => setLatest(r),
      (state, detail) => {
        setConnState(state === 'disconnected' ? 'idle' : state as ConnState);
        setConnDetail(detail || '');
      },
    );
    sessionRef.current = session;
  }, [requestPerms]);

  /** 手动输入 MAC 直接连接 */
  const handleManualConnect = useCallback(async (raw: string) => {
    const mac = raw.toUpperCase().replace(/[^0-9A-F]/g, '').match(/.{2}/g)?.join(':') || raw.toUpperCase();
    if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac)) {
      setConnDetail('MAC 格式不正确，应为 XX:XX:XX:XX:XX:XX');
      return;
    }
    const list = await addDevice({ id: mac, model: 'AFU-WL-TZ-A1' });
    setDevices(list);
    const dev = list.find((d) => d.id === mac);
    if (dev) await handleOpenDevice(dev);
  }, [handleOpenDevice]);

  // 开始扫描添加设备
  const handleAddDevice = useCallback(async () => {
    if (stopScanRef.current) return;
    const ok = await requestPerms();
    if (!ok) { setScanning(false); return; }
    setScanning(true);
    setScanned([]);
    // 扫描前先取当前已绑定 MAC 快照，扫描中跳过它们（只找新设备）
    const alreadyBound = new Set((await getDevices()).map((d) => d.id));
    stopScanRef.current = startContinuousScan({
      onScaleFound: async (deviceId) => {
        // 已绑定的设备不算「新设备」，继续扫描
        if (alreadyBound.has(deviceId)) return;
        alreadyBound.add(deviceId);   // 防重复触发
        const list = await addDevice({ id: deviceId, model: 'AFU-WL-TZ-A1' });
        setDevices(list);
        if (stopScanRef.current) { stopScanRef.current(); stopScanRef.current = null; }
        setScanning(false);
        const dev = list.find((d) => d.id === deviceId);
        if (dev) handleOpenDevice(dev);
      },
      devList: (list) => setScanned(list),
    });
  }, [handleOpenDevice, requestPerms]);

  // 保存测量到指定单位
  const handleSave = useCallback(async (unit: string) => {
    if (!latest || !latest.locked || latest.weight_kg <= 0) return;
    const comp = estimateBodyComposition(
      latest.weight_kg, DEFAULT_PROFILE.height, DEFAULT_PROFILE.age, DEFAULT_PROFILE.sex,
      [latest.impedance_1 ?? 0, latest.impedance_2 ?? 0].filter((v) => v > 0),
    );
    try {
      await appendRecord({
        id: newRecordId(),
        time: new Date().toISOString().slice(0, 19).replace('T', ' '),
        unit,
        weight_kg: latest.weight_kg,
        impedance_1: latest.impedance_1,
        impedance_2: latest.impedance_2,
        adcs: latest.adcs ?? null,
        electrode_on: latest.electrode_on,
        alg_type: latest.alg_type ?? null,
        body_composition: latest.electrode_on ? (comp as Record<string, unknown> | null) : null,
        profile: { sex: DEFAULT_PROFILE.sex, age: DEFAULT_PROFILE.age, height: DEFAULT_PROFILE.height },
      });
      await refreshAll();
      setConnDetail('已保存到「' + unit + '」');
    } catch (e) {
      setConnDetail('保存失败: ' + (e instanceof Error ? e.message : String(e)));
    }
  }, [latest, refreshAll]);

  // 同步
  /** 数据页推送：只推送勾选的记录 */
  const handlePushSelected = useCallback(async (list: MeasurementRecord[]) => {
    if (syncing) return;
    setSyncing(true);
    setSyncMsg('');
    try {
      if (list.length === 0) { setSyncMsg('请先勾选要推送的记录'); return; }
      const cfg: SyncConfig = { url: syncUrl, enabled: true, timeoutMs: 8000 };
      const tc = await testConnection(syncUrl);
      if (!tc.ok) {
        setSyncMsg(`推送失败：电脑端不可达（${tc.ms}ms）\n${tc.detail}`);
        return;
      }
      setSyncMsg(`服务可达（${tc.ms}ms），推送 ${list.length} 条...`);
      const res = await syncRecords(list, cfg);
      if (res.ok) {
        // 标记为已推送，避免重复推送（只标记本次推送成功的 id）
        const updated = await markRecordsSynced(list.map((r) => r.id));
        setRecords(updated);
        setSyncMsg(`推送成功：${res.sent} 条（${res.ms ?? 0}ms）${res.sent < list.length ? `，服务端跳过重复 ${list.length - res.sent} 条` : ''}`);
      } else {
        setSyncMsg(`推送失败：${res.error}`);
      }
    } catch (e) {
      setSyncMsg('推送异常：' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSyncing(false);   // 无论成功失败都必须复位，避免卡在「推送中」
    }
  }, [syncUrl, syncing]);

  /** 设置页测试连接（只测连通，不动数据） */
  const handleTestConn = useCallback(async () => {
    setTestMsg('测试中...');
    try {
      const tc = await testConnection(syncUrl);
      setTestMsg(tc.ok
        ? `连接正常（${tc.ms}ms，${tc.detail}）· 服务地址可用`
        : `连接失败（${tc.ms}ms）：${tc.detail}`);
    } catch (e) {
      setTestMsg('测试异常：' + (e instanceof Error ? e.message : String(e)));
    }
  }, [syncUrl]);

  /** 设置某单位的目标体重（null = 清除） */
  const handleSetGoal = useCallback(async (unit: string, kg: number | null) => {
    setGoals(await setGoal(unit, kg));
  }, []);

  /** 删除记录 */
  const handleDeleteRecord = useCallback(async (id: string) => {
    const next = await deleteRecord(id);
    setRecords(next);
  }, []);

  /** 从电脑端拉取记录并合并到本地 */
  const handlePullRemote = useCallback(async () => {
    setRemoteMsg('拉取中...');
    try {
      const res = await fetchRemoteRecords(syncUrl);
      if (!res.ok) { setRemoteMsg('拉取失败：' + (res.error || '未知')); return; }
      const merged = await mergeRemoteRecords(res.records);
      setRecords(merged.list);
      setRemoteMsg(`拉取完成：远端 ${res.records.length} 条，新增 ${merged.added} 条，标记已推送 ${merged.marked} 条`);
    } catch (e) {
      setRemoteMsg('拉取异常：' + (e instanceof Error ? e.message : String(e)));
    }
  }, [syncUrl]);

  /** 清空调试日志 */
  const handleClearLogs = useCallback(() => {
    clearDebugLogs();
    setDbgLogs('（已清空）');
  }, []);

  // 清理
  useEffect(() => () => { closeSession(); if (stopScanRef.current) stopScanRef.current(); }, [closeSession]);

  const refreshDbg = () => {
    const logs = getDebugLogs().map((l) => new Date(l.ts).toLocaleTimeString('zh-CN') + ' ' + l.msg).join('\n');
    const stats = getScanStats();
    setDbgLogs(`扫描回调 ${stats.count} 次 / 扫描中=${stats.active}\n` + (logs || '(无)'));
  };

  const body = openDevice ? (
    <DevicePage
      device={openDevice}
      units={units}
      state={connState === 'idle' ? 'idle' : connState === 'listening' ? 'listening' : connState === 'error' ? 'error' : 'connecting'}
      stateDetail={connDetail}
      latest={latest}
      profile={DEFAULT_PROFILE}
      onBack={() => { closeSession(); setOpenDevice(null); }}
      onRename={async (n) => { const l = await renameDevice(openDevice.id, n); setDevices(l); setOpenDevice({ ...openDevice, name: n }); }}
      onSave={handleSave}
      onUnbind={async () => {
        closeSession();
        const l = await removeDevice(openDevice.id);
        setDevices(l);
        setOpenDevice(null);
      }}
    />
  ) : tab === 'connect' ? (
    <ConnectPage
      devices={devices}
      scanning={scanning}
      scanned={scanned}
      boundNames={Object.fromEntries(devices.map((d) => [d.id, d.name]))}
      permDenied={permDenied}
      onOpenDevice={handleOpenDevice}
      onAddDevice={handleAddDevice}
      onManualConnect={handleManualConnect}
      onRequestPerm={requestPerms}
      onStopScan={() => {
        if (stopScanRef.current) { stopScanRef.current(); stopScanRef.current = null; }
        setScanning(false);
      }}
    />
  ) : tab === 'data' ? (
    <DataPage
      records={records}
      units={units}
      onSync={handlePushSelected}
      onDelete={handleDeleteRecord}
      syncMsg={syncMsg}
      exporting={syncing}
      goals={goals}
      onSetGoal={handleSetGoal}
    />
  ) : (
    <SettingsPage
      url={syncUrl}
      onUrlChange={updateSyncUrl}
      units={units}
      onAddUnit={async (n) => { setUnits(await addUnit(n)); }}
      onRemoveUnit={async (n) => { setUnits(await removeUnit(n)); }}
      onTestSync={handleTestConn}
      testMsg={testMsg}
      onPullRemote={handlePullRemote}
      remoteMsg={remoteMsg}
      devices={devices}
      onUnbind={async (id) => { const l = await removeDevice(id); setDevices(l); }}
      debugLogs={dbgLogs}
      onRefreshLogs={refreshDbg}
      onClearLogs={handleClearLogs}
    />
  );

  const TAB_META: [Tab, string, string][] = [
    ['connect', '设备', '⚖'],
    ['data', '数据', '◱'],
    ['settings', '设置', '⚙'],
  ];

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={C.bg} />
      <SafeAreaView style={styles.root} edges={['top']}>
        {/* 顶栏 */}
        {!openDevice && (
          <View style={styles.topBar}>
            <Text style={styles.brand}>AFU</Text>
            <Text style={styles.brandSub}>体脂秤</Text>
          </View>
        )}

        <View style={styles.content}>{body}</View>

        {/* 底部导航 */}
        <View style={styles.tabBar}>
          {TAB_META.map(([k, label, icon]) => {
            const active = tab === k && !openDevice;
            return (
              <TouchableOpacity
                key={k}
                activeOpacity={0.7}
                style={styles.tabItem}
                onPress={() => { setTab(k); if (k !== 'connect') { closeSession(); setOpenDevice(null); } }}>
                <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
                  <Text style={[styles.tabIcon, active && { color: C.primary }]}>{icon}</Text>
                </View>
                <Text style={[styles.tabLabel, active && { color: C.primary, fontWeight: '700' }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  topBar: {
    paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14,
  },
  brand: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -1 },
  brandSub: { fontSize: 11, fontWeight: '600', color: C.textHint, letterSpacing: 2, marginTop: -2 },
  topRight: { flexDirection: 'row', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 16 },
  tabBar: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 8, paddingBottom: 22,
  },
  tabItem: { flex: 1, alignItems: 'center' },
  tabIconWrap: {
    width: 44, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  tabIconWrapActive: { backgroundColor: 'rgba(77,141,255,0.14)' },
  tabIcon: { fontSize: 17, color: C.textHint },
  tabLabel: { fontSize: 10, color: C.textHint, marginTop: 2, fontWeight: '600' },
});
