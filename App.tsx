import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { I18nProvider, useI18n } from './src/i18n';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  startContinuousScan, stopScan, startMeasureSession, stopMeasureSession,
  getDebugLogs, getScanStats, clearDebugLogs,
  type MeasurementResult, type UserProfile, type ScannedDeviceInfo, type MeasureSession,
  readDeviceInfo, sendScaleUnbind,
} from './src/ble/scaleBle';
import { getDevices, addDevice, removeDevice, renameDevice, type BoundDevice } from './src/storage/devices';
import {
  appendRecord, readRecords, readUnits, addUnit, removeUnit, deleteRecord, deleteRecords, transferRecords, recalcBodyComposition,
  newRecordId, markRecordsSynced, mergeRemoteRecords, localTimeString, importHistoryEvents, DEFAULT_UNIT, type MeasurementRecord,
} from './src/storage/records';
import { estimateBodyComposition } from './src/protocol/bodycomp';
import { getGoals, setGoal, type GoalMap } from './src/storage/goals';
import { getDisplayUnit, setDisplayUnit, type DisplayUnit } from './src/storage/unitPref';
import {
  getProfiles, upsertProfile, getActiveProfile, setActiveProfileName,
  profileHeightByte, profileWeightEncoded, type UserProfileData,
} from './src/storage/profile';
import { OnboardingPage } from './src/ui/OnboardingPage';
import { PendingPage } from './src/ui/PendingPage';
import { ProfilesPage } from './src/ui/ProfilesPage';
import { getDeviceInfo, saveDeviceInfo, type ScaleDeviceInfo } from './src/storage/deviceInfo';
import { getPendingHistory, addPendingHistory, removePendingHistory, type PendingHistory } from './src/storage/pendingHistory';
import { syncRecords, testConnection, fetchRemoteRecords, type SyncConfig } from './src/sync/sync';
import { ConnectPage } from './src/ui/ConnectPage';
import { ensureBlePermissions, promptOpenSettings } from './src/ble/permissions';
import { DevicePage } from './src/ui/DevicePage';
import { DataPage } from './src/ui/DataPage';
import { SettingsPage } from './src/ui/SettingsPage';
import { C, R, SH } from './src/ui/theme';
import { IconChart, IconCheck, IconChevron, IconScale, IconSettings, IconUser } from './src/ui/Icons';

type Tab = 'connect' | 'data' | 'settings';
type ConnState = 'idle' | 'connecting' | 'listening' | 'error';

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}

function AppInner() {
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
  const [displayUnit, setDisplayUnitState] = useState<DisplayUnit>('kg');
  const [profiles, setProfiles] = useState<UserProfileData[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<ScaleDeviceInfo | null>(null);
  const [pending, setPending] = useState<PendingHistory[]>([]);
  const [showPending, setShowPending] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);
  const [historyToast, setHistoryToast] = useState('');
  const [topUserSheet, setTopUserSheet] = useState(false);
  const [syncUrl, setSyncUrl] = useState('http://192.168.1.5:8765/records');
  const URL_KEY = 'afu_sync_url';
  const [syncMsg, setSyncMsg] = useState('');       // 数据页推送结果
  const [testMsg, setTestMsg] = useState('');       // 设置页测试结果
  const [remoteMsg, setRemoteMsg] = useState('');   // 拉取远端结果
  const [syncing, setSyncing] = useState(false);
  const [dbgLogs, setDbgLogs] = useState('');
  const [permDenied, setPermDenied] = useState(false);
  const { t } = useI18n();

  const sessionRef = useRef<MeasureSession | null>(null);

  const stopScanRef = useRef<(() => void) | null>(null);

  const refreshAll = useCallback(async () => {
    setDevices(await getDevices());
    setRecords(await readRecords());
    setUnits(await readUnits());
    setGoals(await getGoals());
    setDisplayUnitState(await getDisplayUnit());
    const plist = await getProfiles();
    setProfiles(plist);
    setUserProfile(await getActiveProfile());
    setPending(await getPendingHistory());
    setProfileLoaded(true);
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

  useEffect(() => {
    refreshAll();
    // 一次性：用新 Deurenberg 日本版公式重算所有旧记录的体脂（按各记录自身性别档案）
    void (async () => {
      try {
        const done = await AsyncStorage.getItem('afu_bf_recalc_v3');
        if (done) return;
        const n = await recalcBodyComposition((r) => {
          const p = r.profile ?? { sex: 'male', age: 24, height: 168 };
          const comp = estimateBodyComposition(
            r.weight_kg, p.height, p.age, p.sex,
            [r.impedance_1 ?? 0, r.impedance_2 ?? 0].filter((v) => v > 0),
          );
          return comp as Record<string, unknown> | null;
        });
        await AsyncStorage.setItem('afu_bf_recalc_v2', '1');
        if (n > 0) { await refreshAll(); }
      } catch {}
    })();
  }, [refreshAll]);

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
    setDeviceInfo(await getDeviceInfo(dev.id));
    setOpenDevice(dev);
    setTab('connect');
    setLatest(null);
    // 停掉扫描，避免与连接冲突
    if (stopScanRef.current) { stopScanRef.current(); stopScanRef.current = null; setScanning(false); }
    if (sessionRef.current) { sessionRef.current.stop(); sessionRef.current = null; }

    const session = await startMeasureSession(
      dev.id,
      {
        sex: userProfile?.sex ?? 'male',
        age: userProfile?.age ?? 24,
        height: userProfile ? profileHeightByte(userProfile) : 168,
        weightKg: userProfile?.weightKg,
        unit: 'kg',
      } as UserProfile,
      (r) => {
        setLatest(r);
        // 电量来自实时包 data[11]（排除测量状态100），变化时更新缓存
        if (r.battery != null) {
          setDeviceInfo((prev) => {
            if (prev?.battery === r.battery) return prev;
            const next = { ...(prev ?? {}), battery: r.battery };
            void saveDeviceInfo(dev.id, { battery: r.battery! });
            return next;
          });
        }
      },
      (state, detail) => {
        setConnState(
          state === 'disconnected' ? 'idle'
          : state === 'connected' ? 'listening'
          : state as ConnState,
        );
        setConnDetail(detail || '');
      },
      async (histEvents) => {
        // 秤补推的历史 → 先进「待分配」队列，由用户选择归属单位
        const res = await addPendingHistory(
          histEvents.map((h) => ({ time: h.time, weight_kg: h.weight_kg, adcs: h.adcs })),
        );
        if (res.added > 0) {
          setPending(res.list);
          setHistoryToast(t.historySynced.replace('{n}', String(res.added)));
          setTimeout(() => setHistoryToast(''), 3500);
        }
      },
    );
    sessionRef.current = session;
    // 读设备信息（DIS 标准服务）并缓存，供下次同步更新
    void (async () => {
      try {
        const info = await readDeviceInfo(dev.id);
        if (Object.keys(info).length > 0) {
          await saveDeviceInfo(dev.id, info as Parameters<typeof saveDeviceInfo>[1]);
          setDeviceInfo(await getDeviceInfo(dev.id));
        }
      } catch {}
    })();
  }, [requestPerms, userProfile, units, t, refreshAll]);

  /** 把待分配历史正式入库到指定单位 */
  const handleAssignPending = useCallback(async (keys: string[], unit: string) => {
    const list = await getPendingHistory();
    const picked = list.filter((p) => keys.includes(p.key));
    const target = profiles.find((x) => x.name === unit) ?? userProfile;
    for (const p of picked) {
      const adcs = [p.impedance_1 ?? 0, p.impedance_2 ?? 0];
      const hasImp = adcs.some((v) => v > 0);
      const comp = hasImp ? estimateBodyComposition(
        p.weight_kg, target?.heightCm ?? 168, target?.age ?? 24, target?.sex ?? 'male',
        adcs.filter((v) => v > 0),
      ) : null;
      await appendRecord({
        id: newRecordId(),
        time: p.timeStr,
        unit,
        weight_kg: p.weight_kg,
        impedance_1: p.impedance_1,
        impedance_2: p.impedance_2,
        adcs,
        electrode_on: hasImp,
        alg_type: null,
        body_composition: comp as Record<string, unknown> | null,
        profile: { sex: target?.sex ?? 'male', age: target?.age ?? 24, height: Math.round(target?.heightCm ?? 168) },
      });
    }
    setPending(await removePendingHistory(keys));
    await refreshAll();
  }, [userProfile, profiles, refreshAll]);

  /** 丢弃待分配记录 */
  const handleDiscardPending = useCallback(async (keys: string[]) => {
    setPending(await removePendingHistory(keys));
  }, []);

  /** 手动输入 MAC 直接连接 */
  const handleManualConnect = useCallback(async (raw: string) => {
    const mac = raw.toUpperCase().replace(/[^0-9A-F]/g, '').match(/.{2}/g)?.join(':') || raw.toUpperCase();
    if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac)) {
      setConnDetail(t.macFormat);
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
    // 3 秒内若扫描回调数为 0，提示可能是系统蓝牙未开启
    setTimeout(() => {
      if (getScanStats().count === 0 && stopScanRef.current) {
        setConnDetail('扫描无响应 — 请确认系统蓝牙已开启');
      }
    }, 3000);
  }, [handleOpenDevice, requestPerms]);

  // 保存测量到指定单位
  const handleSave = useCallback(async (unit: string) => {
    if (!latest || !latest.locked || latest.weight_kg <= 0) return;
    // 按保存时选中的用户档案计算体脂（而非固定连接用户）
    const target = profiles.find((p) => p.name === unit) ?? userProfile;
    const comp = estimateBodyComposition(
        latest.weight_kg, target?.heightCm ?? 168, target?.age ?? 24, target?.sex ?? 'male',
      [latest.impedance_1 ?? 0, latest.impedance_2 ?? 0].filter((v) => v > 0),
    );
    try {
      await appendRecord({
        id: newRecordId(),
        time: localTimeString(),
        unit,
        weight_kg: latest.weight_kg,
        impedance_1: latest.impedance_1,
        impedance_2: latest.impedance_2,
        adcs: latest.adcs ?? null,
        electrode_on: latest.electrode_on,
        alg_type: latest.alg_type ?? null,
        body_composition: comp as Record<string, unknown> | null,
        profile: { sex: target?.sex ?? 'male', age: target?.age ?? 24, height: Math.round(target?.heightCm ?? 168) },
      });
      await refreshAll();
      setConnDetail(`${t.saved} ${unit}`);
    } catch (e) {
      setConnDetail(t.saveFail + ': ' + (e instanceof Error ? e.message : String(e)));
    }
  }, [profiles, userProfile, latest, refreshAll]);

  // 同步
  /** 数据页推送：只推送勾选的记录 */
  const handlePushSelected = useCallback(async (list: MeasurementRecord[]) => {
    if (syncing) return;
    setSyncing(true);
    setSyncMsg('');
    try {
      if (list.length === 0) { setSyncMsg(t.selectFirst); return; }
      const cfg: SyncConfig = { url: syncUrl, enabled: true, timeoutMs: 8000 };
      const tc = await testConnection(syncUrl);
      if (!tc.ok) {
        setSyncMsg(`${t.pushFail} (${tc.ms}ms)\n${tc.detail}`);
        return;
      }
      setSyncMsg(`${t.connOk} (${tc.ms}ms) — ${list.length}…`);
      const res = await syncRecords(list, cfg);
      if (res.ok) {
        // 标记为已推送，避免重复推送（只标记本次推送成功的 id）
        const updated = await markRecordsSynced(list.map((r) => r.id));
        setRecords(updated);
        setSyncMsg(`${t.pushOk}: ${res.sent} (${res.ms ?? 0}ms)`);
      } else {
        setSyncMsg(`${t.pushFail}: ${res.error}`);
      }
    } catch (e) {
      setSyncMsg(t.pushFail + ': ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSyncing(false);   // 无论成功失败都必须复位，避免卡在「推送中」
    }
  }, [syncUrl, syncing]);

  /** 设置页测试连接（只测连通，不动数据） */
  const handleTestConn = useCallback(async () => {
    setTestMsg(t.testing);
    try {
      const tc = await testConnection(syncUrl);
      setTestMsg(tc.ok
        ? `${t.connOk} (${tc.ms}ms, ${tc.detail})`
        : `${t.connFail} (${tc.ms}ms): ${tc.detail}`);
    } catch (e) {
      setTestMsg(t.connFail + ': ' + (e instanceof Error ? e.message : String(e)));
    }
  }, [syncUrl]);

  /** 切换显示单位（持久化） */
  const handleDisplayUnit = useCallback(async (u: DisplayUnit) => {
    setDisplayUnitState(u);
    await setDisplayUnit(u);
  }, []);

  /** 设置某单位的目标体重（null = 清除） */
  const handleSetGoal = useCallback(async (unit: string, kg: number | null) => {
    setGoals(await setGoal(unit, kg));
  }, []);

  /** 删除记录（支持批量） */
  const handleDeleteRecord = useCallback(async (ids: string[]) => {
    const next = await deleteRecords(ids);
    setRecords(next);
  }, []);

  /** 转移记录所有者给其他用户 */
  const handleTransfer = useCallback(async (ids: string[], unit: string) => {
    const target = profiles.find((p) => p.name === unit);
    const prof = target
      ? { sex: target.sex, age: target.age, height: Math.round(target.heightCm) }
      : { sex: userProfile?.sex ?? 'male', age: userProfile?.age ?? 24, height: Math.round(userProfile?.heightCm ?? 168) };
    const next = await transferRecords(ids, unit, prof);
    setRecords(next);
  }, [profiles, userProfile]);

  /** 从电脑端拉取记录并合并到本地 */
  const handlePullRemote = useCallback(async () => {
    setRemoteMsg(t.pulling);
    try {
      const res = await fetchRemoteRecords(syncUrl);
      if (!res.ok) { setRemoteMsg(`${t.connFail}: ${res.error || '?'}`); return; }
      const merged = await mergeRemoteRecords(res.records);
      setRecords(merged.list);
      setRemoteMsg(`${t.pullResult}: +${merged.added} / ✓${merged.marked} (${res.records.length})`);
    } catch (e) {
      setRemoteMsg(t.connFail + ': ' + (e instanceof Error ? e.message : String(e)));
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

  if (profileLoaded && !userProfile) {
    return (
      <SafeAreaProvider>
        <OnboardingPage onSave={async (p) => {
          const list = await upsertProfile(p);
          await setActiveProfileName(p.name);
          setProfiles(list);
          setUserProfile(p);
        }} />
      </SafeAreaProvider>
    );
  }

  const body = showProfiles ? (
    <ProfilesPage
      profiles={profiles}
      activeName={userProfile?.name}
      onSave={async (p) => {
        const list = await upsertProfile(p);
        setProfiles(list);
        if (p.name === userProfile?.name) setUserProfile(p);
      }}
      onRemove={async (name) => {
        const { removeProfile } = await import('./src/storage/profile');
        const list = await removeProfile(name);
        setProfiles(list);
        if (name === userProfile?.name) setUserProfile(list[0] ?? null);
      }}
      onActivate={async (name) => {
        await setActiveProfileName(name);
        setUserProfile(profiles.find((p) => p.name === name) ?? profiles[0] ?? null);
      }}
      onBack={() => setShowProfiles(false)}
    />
  ) : showPending ? (
    <PendingPage
      items={pending}
      units={profiles.map((p) => p.name)}
      profiles={profiles}
      displayUnit={displayUnit}
      onAssign={handleAssignPending}
      onDiscard={handleDiscardPending}
      onBack={() => setShowPending(false)}
    />
  ) : openDevice ? (
    <DevicePage
      device={openDevice}
      units={profiles.length > 0 ? profiles.map((p) => p.name) : units}
      profiles={profiles}
      state={connState === 'idle' ? 'idle' : connState === 'listening' ? 'listening' : connState === 'error' ? 'error' : 'connecting'}
      stateDetail={connDetail}
      historyToast={historyToast}
      displayUnit={displayUnit}
      deviceInfo={deviceInfo}
      latest={latest}
      profile={{ sex: userProfile?.sex ?? 'male', age: userProfile?.age ?? 24, height: Math.round(userProfile?.heightCm ?? 168) }}
      onBack={() => { closeSession(); setOpenDevice(null); }}
      onRename={async (n) => { const l = await renameDevice(openDevice.id, n); setDevices(l); setOpenDevice({ ...openDevice, name: n }); }}
      onSave={handleSave}
      onUnbind={async () => {
        closeSession();
        if (stopScanRef.current) { stopScanRef.current(); stopScanRef.current = null; setScanning(false); }
        // 先向秤发送官方解绑命令(02)，清除秤内部绑定配置
        try { await sendScaleUnbind(openDevice.id); } catch {}
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
      onTransfer={handleTransfer}
      profiles={profiles}
      activeUserName={userProfile?.name}
      syncMsg={syncMsg}
      exporting={syncing}
      goals={goals}
      onSetGoal={handleSetGoal}
      displayUnit={displayUnit}
    />
  ) : (
    <SettingsPage
      url={syncUrl}
      onUrlChange={updateSyncUrl}
      onTestSync={handleTestConn}
      testMsg={testMsg}
      onPullRemote={handlePullRemote}
      remoteMsg={remoteMsg}
      devices={devices}
      onUnbind={async (id) => { try { await sendScaleUnbind(id); } catch {} const l = await removeDevice(id); setDevices(l); }}
      debugLogs={dbgLogs}
      onRefreshLogs={refreshDbg}
      onClearLogs={handleClearLogs}
      displayUnit={displayUnit}
      onDisplayUnitChange={handleDisplayUnit}
      pendingCount={pending.length}
      onOpenPending={() => setShowPending(true)}
      activeProfileName={userProfile?.name}
      profilesCount={profiles.length}
      onOpenProfiles={() => setShowProfiles(true)}
    />
  );

  const TAB_META: [Tab, string, string][] = [
    ['connect', t.tabDevice, ''],
    ['data', t.tabData, ''],
    ['settings', t.tabSettings, ''],
  ];

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={C.bg} />
      <SafeAreaView style={styles.root} edges={['top']}>
        {/* 顶栏 */}
        {!openDevice && (
          <View style={styles.topBar}>
            <View style={styles.brandWrap}>
              <View style={styles.brandMark} />
              <View>
                <Text style={styles.brand}>AFU</Text>
                <Text style={styles.brandSub}>{t.brandSub}</Text>
              </View>
            </View>
            {profiles.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setTopUserSheet(true)}
                style={styles.topUserBtn}>
                <View style={styles.topUserAvatar}>
                  <Text style={styles.topUserAvatarChar}>{(userProfile?.name ?? profiles[0].name).slice(0, 1)}</Text>
                </View>
                <View>
                  <Text style={styles.topUserName} numberOfLines={1}>{userProfile?.name ?? profiles[0].name}</Text>
                  <Text style={styles.topUserSex}>{userProfile?.sex === 'male' ? '男' : '女'}</Text>
                </View>
                <IconChevron size={11} color={C.textHint} dir="down" />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.content}>{body}</View>

        {/* 底部导航 */}
        <View style={styles.tabBar}>
          {TAB_META.map(([k, label]) => {
            const active = tab === k && !openDevice;
            const color = active ? C.primary : C.textHint;
            const iconNode = k === 'connect'
              ? <IconScale size={20} color={color} />
              : k === 'data'
                ? <IconChart size={20} color={color} />
                : <IconSettings size={20} color={color} />;
            return (
              <TouchableOpacity
                key={k}
                activeOpacity={0.7}
                style={styles.tabItem}
                onPress={() => {
                  setTab(k);
                  if (k !== 'connect') {
                    closeSession();
                    setOpenDevice(null);
                    if (stopScanRef.current) { stopScanRef.current(); stopScanRef.current = null; setScanning(false); }
                  }
                }}>
                <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
                  {iconNode}
                </View>
                <Text style={[styles.tabLabel, active && { color: C.primary, fontWeight: '700' }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 顶栏用户快速切换 */}
        <Modal visible={topUserSheet} transparent animationType="fade" onRequestClose={() => setTopUserSheet(false)}>
          <TouchableOpacity style={styles.modalMask} activeOpacity={1} onPress={() => setTopUserSheet(false)}>
            <View style={styles.userMenu}>
              <View style={styles.userMenuHead}>
                <IconUser size={14} color={C.textSub} />
                <Text style={styles.userMenuTitle}>{t.activeProfileLabel}</Text>
              </View>
              {profiles.map((pf) => {
                const active = pf.name === userProfile?.name;
                return (
                  <TouchableOpacity key={pf.name} activeOpacity={0.85}
                    style={[styles.userMenuItem, active && styles.userMenuItemActive]}
                    onPress={() => {
                      void setActiveProfileName(pf.name);
                      setUserProfile(pf);
                      setTopUserSheet(false);
                    }}>
                    <View style={[styles.menuAvatar, active && { backgroundColor: C.accentSoft }]}>
                      <Text style={[styles.menuAvatarChar, active && { color: C.accent }]}>{pf.name.slice(0, 1)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.userMenuName, active && { color: C.text }]}>{pf.name}</Text>
                      <Text style={styles.userMenuDesc}>
                        {pf.sex === 'male' ? '男' : '女'} · {pf.age} · {pf.heightCm}cm
                      </Text>
                    </View>
                    {active ? <IconCheck size={14} color={C.accent} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12,
  },
  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: {
    width: 3, height: 26, borderRadius: 2,
    backgroundColor: C.primary,
  },
  brand: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: -0.6, lineHeight: 24 },
  brandSub: { fontSize: 9, fontWeight: '700', color: C.textHint, letterSpacing: 2.4 },
  topUserBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingLeft: 6, paddingRight: 11, paddingVertical: 5, borderRadius: R.pill,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  topUserAvatar: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  topUserAvatarChar: { fontSize: 12, fontWeight: '800', color: C.primary },
  topUserName: { fontSize: 12, fontWeight: '700', color: C.text, maxWidth: 78 },
  topUserSex: { fontSize: 9, color: C.textHint, marginTop: -1 },
  modalMask: {
    flex: 1, backgroundColor: 'rgba(5,7,12,0.6)',
    justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 118, paddingRight: 16,
  },
  userMenu: {
    backgroundColor: C.surface, borderRadius: R.lg, paddingVertical: 6, minWidth: 210,
    borderWidth: 1, borderColor: C.borderStrong, ...SH.card,
  },
  userMenuHead: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingTop: 6, paddingBottom: 8,
  },
  userMenuTitle: { fontSize: 11, color: C.textHint, fontWeight: '700', letterSpacing: 0.4 },
  userMenuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  userMenuItemActive: { backgroundColor: 'rgba(0,217,163,0.05)' },
  menuAvatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  menuAvatarChar: { fontSize: 13, fontWeight: '800', color: C.primary },
  userMenuName: { fontSize: 14, fontWeight: '700', color: C.textSub },
  userMenuDesc: { fontSize: 10, color: C.textHint, marginTop: 1 },
  content: { flex: 1, paddingHorizontal: 16 },
  tabBar: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 8, paddingBottom: 20,
  },
  tabItem: { flex: 1, alignItems: 'center' },
  tabIconWrap: {
    width: 46, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  tabIconWrapActive: { backgroundColor: C.primarySoft },
  tabLabel: { fontSize: 10, color: C.textHint, marginTop: 3, fontWeight: '600' },
});
