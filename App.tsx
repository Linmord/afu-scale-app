import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  connectAndMeasure,
  disconnectAll,
  scanAfuScales,
  type MeasurementResult,
  type UserProfile,
} from './src/ble/scaleBle';
import { estimateBodyComposition } from './src/protocol/bodycomp';
import { appendRecord, readRecords, type MeasurementRecord } from './src/storage/records';
import { syncRecords, testConnection, type SyncConfig } from './src/sync/sync';

const PROFILE: UserProfile = { age: 24, sex: 'female', height: 168, unit: 'kg' };
const DEFAULT_SYNC: SyncConfig = { url: 'http://192.168.1.10:8765/records', enabled: false };

type Phase = 'idle' | 'scanning' | 'measuring' | 'done';

export default function App() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [devices, setDevices] = useState<string[]>([]);
  const [latest, setLatest] = useState<MeasurementResult | null>(null);
  const [records, setRecords] = useState<MeasurementRecord[]>([]);
  const [sync, setSync] = useState<SyncConfig>(DEFAULT_SYNC);
  const [syncMsg, setSyncMsg] = useState('');
  const [error, setError] = useState('');

  const refreshRecords = useCallback(async () => {
    const r = await readRecords();
    setRecords(r);
  }, []);

  useEffect(() => { refreshRecords(); }, [refreshRecords]);

  const doScan = useCallback(async () => {
    setError('');
    setPhase('scanning');
    try {
      const found = await scanAfuScales(12000);
      setDevices(found);
      if (found.length === 0) {
        setError('未发现 AFU-WL-TZ-A1。请轻踩秤唤醒，或确认蓝牙已开启。');
        setPhase('idle');
      } else {
        setPhase('idle');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('idle');
    }
  }, []);

  const doMeasure = useCallback(async (deviceId: string) => {
    setError('');
    setLatest(null);
    setPhase('measuring');
    try {
      const stop = await connectAndMeasure(
        deviceId,
        PROFILE,
        (r) => {
          setLatest(r);
          if (r.locked) {
            // 锁定后自动记录
            const comp = estimateBodyComposition(r.weight_kg, PROFILE.height, PROFILE.age, PROFILE.sex, [r.impedance_1 ?? 0, r.impedance_2 ?? 0].filter((v) => v > 0));
            const rec: MeasurementRecord = {
              time: new Date().toISOString().replace('T', ' ').slice(0, 19),
              weight_kg: r.weight_kg,
              impedance_1: r.impedance_1,
              impedance_2: r.impedance_2,
              body_composition: comp as Record<string, unknown> | null,
              profile: { sex: PROFILE.sex, age: PROFILE.age, height: PROFILE.height },
            };
            appendRecord(rec).then(() => refreshRecords());
            setPhase('done');
            setTimeout(() => stop(), 500);
          }
        },
        () => { setPhase('idle'); },
        30000,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('idle');
    }
  }, [refreshRecords]);

  const doSync = useCallback(async () => {
    setSyncMsg('');
    setSyncMsg('测试连接...');
    const ok = await testConnection(sync.url);
    if (!ok) {
      setSyncMsg('电脑端未连通，请确认电脑开着、接收服务已启动、手机与电脑在同一网络。');
      return;
    }
    setSyncMsg('同步中...');
    const result = await syncRecords(records, sync);
    setSyncMsg(result.ok ? `已同步 ${result.sent} 条` : '同步失败: ' + (result.error || '未知'));
  }, [records, sync]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>AFU 体脂秤</Text>
        <Text style={styles.subtitle}>连接 · 记录 · 同步</Text>

        <View style={styles.card}>
          <Text style={styles.label}>1. 扫描体脂秤</Text>
          <Button title={phase === 'scanning' ? '扫描中...' : '扫描'} onPress={doScan} disabled={phase === 'measuring'} />
          {devices.map((d) => (
            <View key={d} style={styles.deviceRow}>
              <Text style={styles.deviceText}>{d}</Text>
              <Button title="开始测量" onPress={() => doMeasure(d)} disabled={phase === 'measuring'} />
            </View>
          ))}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>2. 测量结果</Text>
          {phase === 'measuring' && !latest ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={styles.hint}>请赤脚站上秤，保持稳定</Text>
            </View>
          ) : latest ? (
            <View style={styles.result}>
              <Text style={styles.big}>{latest.weight_kg.toFixed(2)} kg</Text>
              <Text style={styles.small}>
                阻抗 {latest.impedance_1 ?? '-'} / {latest.impedance_2 ?? '-'} Ω
                {latest.locked ? ' · 已锁定' : ' · 称重中'}
              </Text>
              {latest.locked && latest.weight_kg > 0 && (
                <Text style={styles.small}>
                  {(() => {
                    const comp = estimateBodyComposition(latest.weight_kg, PROFILE.height, PROFILE.age, PROFILE.sex, [latest.impedance_1 ?? 0, latest.impedance_2 ?? 0].filter((v) => v > 0));
                    return comp ? `体脂 ${comp.body_fat_percent}% · 肌肉 ${comp.muscle_percent}% · 水分 ${comp.water_percent}%` : '体脂估算失败';
                  })()}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.hint}>尚未测量</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>3. 同步到电脑</Text>
          <Text style={styles.hint}>地址: {sync.enabled ? sync.url : '(未启用)'}</Text>
          <Button
            title={sync.enabled ? '同步' : '启用并同步'}
            onPress={() => { setSync({ ...sync, enabled: true }); }}
          />
          {sync.enabled && (
            <Button title="同步到电脑" onPress={doSync} />
          )}
          {syncMsg ? <Text style={styles.syncMsg}>{syncMsg}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>本地记录（{records.length} 条）</Text>
          {records.slice(-5).reverse().map((r, i) => (
            <View key={i} style={styles.recordRow}>
              <Text style={styles.recordText}>
                {r.time} · {r.weight_kg.toFixed(2)} kg
              </Text>
            </View>
          ))}
          {records.length === 0 ? <Text style={styles.hint}>暂无记录</Text> : null}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#222' },
  subtitle: { fontSize: 14, color: '#777', marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  center: { alignItems: 'center', paddingVertical: 16 },
  hint: { color: '#999', fontSize: 14, textAlign: 'center', marginTop: 8 },
  error: { color: '#c0392b', fontSize: 13, marginTop: 8 },
  syncMsg: { color: '#2c7a4b', fontSize: 13, marginTop: 8 },
  deviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  deviceText: { fontSize: 13, color: '#444', flex: 1, marginRight: 8 },
  result: { alignItems: 'center', paddingVertical: 12 },
  big: { fontSize: 36, fontWeight: 'bold', color: '#222' },
  small: { fontSize: 14, color: '#555', marginTop: 6 },
  recordRow: { paddingVertical: 6, borderTopColor: '#eee', borderTopWidth: 1, marginTop: 6 },
  recordText: { fontSize: 13, color: '#444' },
});
