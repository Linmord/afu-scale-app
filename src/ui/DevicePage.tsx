import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, G, R, SH, T, S } from './theme';
import { useI18n } from '../i18n';
import { Card, PrimaryButton, GhostButton, Badge, Sheet, SectionTitle } from './components';
import type { BoundDevice } from '../storage/devices';
import type { MeasurementResult } from '../ble/scaleBle';
import { estimateBodyComposition } from '../protocol/bodycomp';

interface Props {
  device: BoundDevice;
  units: string[];
  state: 'idle' | 'connecting' | 'listening' | 'error';
  stateDetail?: string;
  latest: MeasurementResult | null;
  profile: { age: number; sex: 'male' | 'female'; height: number };
  onBack: () => void;
  onRename: (name: string) => void;
  onSave: (unit: string) => void;
  onUnbind: () => void;
  historyFound?: number;
}

const BC_GRID: [string, string, string][] = [
  ['body_fat_percent', '体脂率', '%'],
  ['muscle_percent', '肌肉率', '%'],
  ['water_percent', '水分率', '%'],
  ['protein_percent', '蛋白质', '%'],
  ['bone_mass_kg', '骨量', 'kg'],
  ['skeletal_muscle_mass_kg', '骨骼肌', 'kg'],
];

export function DevicePage({
  device, units, state, stateDetail, latest, profile, onBack, onRename, onSave, onUnbind, historyFound,
}: Props) {
  const { t } = useI18n();
  const [name, setName] = useState(device.name);
  const [editing, setEditing] = useState(false);
  const [saveSheet, setSaveSheet] = useState(false);

  const comp = latest && latest.locked && latest.weight_kg > 0
    ? estimateBodyComposition(latest.weight_kg, profile.height, profile.age, profile.sex,
        [latest.impedance_1 ?? 0, latest.impedance_2 ?? 0].filter((v) => v > 0))
    : null;

  const connected = state === 'listening';
  const stateLabel = state === 'connecting' ? t.stateConnecting : connected ? t.stateConnected : state === 'error' ? t.stateError : t.stateIdle;
  const stateColor = state === 'error' ? C.danger : connected ? C.accent : C.textHint;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹ {t.back}</Text>
      </TouchableOpacity>

      {/* Hero 体重卡 */}
      <LinearGradient colors={G.hero as never} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={S.rowBetween}>
          <Text style={styles.heroDevice}>{device.name}</Text>
          <View style={[styles.statusDot, { backgroundColor: stateColor }]} />
        </View>

        <View style={styles.weightArea}>
          {latest && latest.weight_kg > 0 ? (
            <>
              <Text style={styles.weightValue}>{latest.weight_kg.toFixed(1)}</Text>
              <Text style={styles.weightUnit}>kg</Text>
            </>
          ) : (
            <Text style={styles.weightPlaceholder}>--.-</Text>
          )}
        </View>

        <Text style={[styles.stateText, { color: stateColor }]}>
          {stateLabel}{stateDetail ? ' · ' + stateDetail : ''}
        </Text>

        {state === 'connecting' && <ActivityIndicator color={C.primary} style={{ marginTop: 14 }} />}
        {connected && !latest && <Text style={styles.hintCenter}>{t.standOnScale}</Text>}

        {latest && !latest.electrode_on && (
          <View style={styles.warnBox}>
            <Text style={styles.warnBoxText}>{t.electrodeOff}</Text>
          </View>
        )}
      </LinearGradient>

      {historyFound !== undefined && historyFound > 0 && (
        <View style={[S.card, { borderColor: 'rgba(0,217,163,0.4)' }]}>
          <Text style={{ fontSize: 14, color: C.accent, fontWeight: '700' }}>
            📦 从秤上补收 {historyFound} 条历史记录（已入库）
          </Text>
        </View>
      )}

      {/* 身体成分 */}
      {latest && latest.locked && latest.electrode_on && comp && (
        <Card>
          <SectionTitle title={t.bodyComp} right={<Badge text={t.localEstimate} color={C.warn} />} />
          <View style={styles.grid}>
            {BC_GRID.filter(([k]) => (comp as unknown as Record<string, number>)[k] !== undefined).map(([k, labelKey, unit]) => (
              <View key={k} style={styles.gridItem}>
                <Text style={styles.gridValue}>
                  {(comp as unknown as Record<string, number>)[k]}<Text style={styles.gridUnit}>{unit}</Text>
                </Text>
                <Text style={styles.gridLabel}>{(t as unknown as Record<string, string>)[labelKey]}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* 保存 */}
      {latest && latest.locked && latest.weight_kg > 0 && (
        <PrimaryButton title={t.saveMeasurement} onPress={() => setSaveSheet(true)} colors={G.accent} />
      )}

      {/* 设备信息 */}
      <Card style={{ marginTop: 14 }}>
        <SectionTitle title={t.deviceInfo} />
        {editing ? (
          <>
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="设备名称" placeholderTextColor={C.textHint} />
            <View style={[S.row, { gap: 10, marginTop: 10 }]}>
              <PrimaryButton title={t.save} onPress={() => { onRename(name.trim() || device.name); setEditing(false); }} style={{ flex: 1 }} />
              <GhostButton title={t.cancel} onPress={() => { setName(device.name); setEditing(false); }} style={{ flex: 1 }} />
            </View>
          </>
        ) : (
          <>
            <InfoRow k={t.devName} v={device.name} onPress={() => setEditing(true)} action={t.rename} />
            <InfoRow k={t.devModel} v={device.model} />
            <InfoRow k="MAC" v={device.id} mono />
            <InfoRow k={t.devBoundAt} v={device.boundAt} />
          </>
        )}
      </Card>

      <GhostButton title={t.unbind} danger onPress={onUnbind} style={{ marginTop: 6 }} />

      {/* 分配单位选择 */}
      <Sheet visible={saveSheet} onClose={() => setSaveSheet(false)} title={t.whoIsThis}>
        {units.map((u) => (
          <TouchableOpacity key={u} activeOpacity={0.8} style={styles.unitBtn}
            onPress={() => { setSaveSheet(false); onSave(u); }}>
            <Text style={styles.unitText}>{u}</Text>
            <Text style={styles.unitChev}>›</Text>
          </TouchableOpacity>
        ))}
        <GhostButton title={t.cancel} onPress={() => setSaveSheet(false)} style={{ marginTop: 12 }} />
      </Sheet>
    </ScrollView>
  );
}

function InfoRow({ k, v, mono, onPress, action }: { k: string; v: string; mono?: boolean; onPress?: () => void; action?: string }) {
  return (
    <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress} style={styles.infoRow}>
      <Text style={styles.infoKey}>{k}</Text>
      <View style={S.row}>
        <Text style={[styles.infoVal, mono && { fontFamily: 'monospace', fontSize: 12 }]} numberOfLines={1}>{v}</Text>
        {action ? <Text style={styles.infoAction}>{action}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  back: { paddingVertical: 6, marginBottom: 6 },
  backText: { color: C.primary, fontSize: 15, fontWeight: '600' },
  hero: { borderRadius: R.xl, padding: 22, marginBottom: 14, borderWidth: 1, borderColor: C.border, ...SH.card },
  heroDevice: { fontSize: 15, fontWeight: '700', color: C.text },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  weightArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginTop: 18, marginBottom: 6 },
  weightValue: { fontSize: 72, fontWeight: '800', color: C.text, letterSpacing: -3, lineHeight: 78 },
  weightUnit: { fontSize: 20, fontWeight: '700', color: C.textSub, marginLeft: 6, marginBottom: 12 },
  weightPlaceholder: { fontSize: 72, fontWeight: '800', color: C.textHint, letterSpacing: -3, lineHeight: 78 },
  stateText: { textAlign: 'center', fontSize: 13, fontWeight: '600' },
  hintCenter: { textAlign: 'center', fontSize: 13, color: C.textHint, marginTop: 12 },
  warnBox: {
    marginTop: 14, backgroundColor: 'rgba(255,176,32,0.12)', borderRadius: R.sm,
    padding: 10, borderWidth: 1, borderColor: 'rgba(255,176,32,0.3)',
  },
  warnBoxText: { fontSize: 12, color: C.warn, textAlign: 'center', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '33.33%', alignItems: 'center', paddingVertical: 12 },
  gridValue: { fontSize: 19, fontWeight: '800', color: C.text },
  gridUnit: { fontSize: 11, fontWeight: '600', color: C.textHint },
  gridLabel: { fontSize: 11, color: C.textHint, marginTop: 3 },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md,
    padding: 13, fontSize: 15, color: C.text,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.border },
  infoKey: { fontSize: 13, color: C.textHint },
  infoVal: { fontSize: 13, color: C.text, fontWeight: '600', maxWidth: 200 },
  infoAction: { fontSize: 12, color: C.primary, marginLeft: 10 },
  unitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
  },
  unitText: { fontSize: 16, fontWeight: '600', color: C.text },
  unitChev: { fontSize: 20, color: C.textHint },
});
