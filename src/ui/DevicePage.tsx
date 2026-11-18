import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, G, R, SH, T, S } from './theme';
import { useI18n } from '../i18n';
import { unitLabel, formatWeight, type DisplayUnit } from '../storage/unitPref';
import type { ScaleDeviceInfo } from '../storage/deviceInfo';
import { Card, PrimaryButton, GhostButton, Badge, Sheet, SectionTitle, ScalePress } from './components';
import { IconCheck, IconChevron, IconInfo } from './Icons';
import type { BoundDevice } from '../storage/devices';
import type { MeasurementResult } from '../ble/scaleBle';
import { estimateBodyComposition } from '../protocol/bodycomp';

interface Props {
  device: BoundDevice;
  units: string[];
  state: 'idle' | 'connecting' | 'listening' | 'error';
  stateDetail?: string;
  historyToast?: string;
  latest: MeasurementResult | null;
  profile: { age: number; sex: 'male' | 'female'; height: number };
  onBack: () => void;
  onRename: (name: string) => void;
  onSave: (unit: string) => void;
  onUnbind: () => void;
  displayUnit?: DisplayUnit;
  deviceInfo?: ScaleDeviceInfo | null;
  profiles?: { name: string; sex: string; age: number; heightCm: number; weightKg?: number }[];
}

const BC_GRID: [string, string, string, string][] = [
  ['body_fat_percent', 'bcFat', '%', C.warn],
  ['muscle_percent', 'bcMuscle', '%', C.accent],
  ['water_percent', 'bcWater', '%', C.primary],
  ['protein_percent', 'bcProtein', '%', '#9B8CFF'],
  ['bone_mass_kg', 'bcBone', 'kg', C.textSub],
  ['skeletal_muscle_mass_kg', 'bcSkeletal', 'kg', '#38BDF8'],
];

export function DevicePage({
  device, units, state, stateDetail, historyToast, latest, profile,
  onBack, onRename, onSave, onUnbind, displayUnit = 'kg', deviceInfo, profiles = [],
}: Props) {
  const { t } = useI18n();
  const [name, setName] = useState(device.name);
  const [editing, setEditing] = useState(false);
  const [saveSheet, setSaveSheet] = useState(false);

  const comp = latest && latest.locked && latest.weight_kg > 0
    ? estimateBodyComposition(
        latest.weight_kg, profile.height, profile.age, profile.sex,
        [latest.impedance_1 ?? 0, latest.impedance_2 ?? 0].filter((v) => v > 0),
      )
    : null;

  const phase = latest?.phase ?? (latest?.locked ? 'done' : 'weighing');
  const hasImp = ((latest?.impedance_1 ?? 0) > 0 || (latest?.impedance_2 ?? 0) > 0);
  const measuring = state === 'listening';

  const weightAnim = useRef(new Animated.Value(0)).current;
  const [displayWeight, setDisplayWeight] = useState(0);
  useEffect(() => {
    const target = latest?.weight_kg ?? 0;
    const id = weightAnim.addListener(function (s) { setDisplayWeight(s.value); });
    Animated.spring(weightAnim, { toValue: target, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
    return function () { weightAnim.removeListener(id); };
  }, [latest?.weight_kg, weightAnim]);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const target = !measuring ? 0 : phase === 'done' ? 1 : phase === 'impedance' ? 0.66 : 0.33;
    Animated.timing(progressAnim, { toValue: target, duration: 420, useNativeDriver: false }).start();
  }, [phase, measuring, progressAnim]);

  useEffect(() => {
    if (!measuring || phase === 'done') { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [measuring, phase, pulseAnim]);

  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const steps: { key: string; label: string; active: boolean; done: boolean; grey: boolean }[] = [
    { key: 'weighing', label: t.phaseWeighing, active: measuring && phase === 'weighing', done: measuring && phase !== 'weighing', grey: false },
    { key: 'impedance', label: t.phaseImpedance, active: measuring && phase === 'impedance', done: phase === 'done' && hasImp, grey: phase === 'done' && !hasImp },
    { key: 'done', label: t.phaseDone, active: phase === 'done', done: phase === 'done', grey: false },
  ];

  const connected = state === 'listening';
  const stateLabel = state === 'connecting' ? t.stateConnecting : connected ? t.stateConnected : state === 'error' ? t.stateError : t.stateIdle;
  const stateColor = state === 'error' ? C.danger : connected ? C.accent : state === 'connecting' ? C.primary : C.textHint;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      {historyToast ? (
        <View style={styles.historyToast}>
          <IconCheck size={14} color={C.accent} />
          <Text style={styles.historyToastText}>{historyToast}</Text>
        </View>
      ) : null}

      <TouchableOpacity onPress={onBack} style={styles.back} activeOpacity={0.7}>
        <IconChevron size={15} color={C.primary} dir="left" />
        <Text style={styles.backText}>{t.back}</Text>
      </TouchableOpacity>

      {/* Hero 体重仪表盘卡 */}
      <LinearGradient colors={G.hero as never} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={S.rowBetween}>
          <Text style={styles.heroDevice}>{device.name}</Text>
          <View style={[styles.statePill, { borderColor: stateColor + '44', backgroundColor: stateColor + '16' }]}>
            <View style={[styles.statusDot, { backgroundColor: stateColor }]} />
            <Text style={[styles.statePillText, { color: stateColor }]}>
              {stateLabel}{stateDetail ? ' · ' + stateDetail : ''}
            </Text>
          </View>
        </View>

        <View style={styles.weightArea}>
          {latest && latest.weight_kg >= 0 ? (
            <>
              <Text style={[styles.weightValue, T.num]}>
                {formatWeight(latest && latest.locked ? latest.weight_kg : displayWeight, displayUnit)}
              </Text>
              <Text style={styles.weightUnit}>{unitLabel(displayUnit)}</Text>
            </>
          ) : (
            <>
              <Text style={[styles.weightPlaceholder, T.num]}>--.--</Text>
              <Text style={styles.weightUnit}>{unitLabel(displayUnit)}</Text>
            </>
          )}
        </View>

        {/* 测量步进进度条 */}
        {measuring && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: barWidth }]} />
            </View>
            <View style={styles.stepRow}>
              {steps.map((s) => (
                <Animated.View key={s.key} style={[styles.stepItem, s.active ? { opacity: pulseAnim } : null]}>
                  <View style={[
                    styles.stepDot,
                    s.grey ? styles.stepDotGrey : s.done ? styles.stepDotDone : s.active ? styles.stepDotActive : null,
                  ]} />
                  <Text
                    style={[
                      styles.stepText,
                      s.grey ? styles.stepGrey : s.done ? styles.stepDone : s.active ? styles.stepActive : null,
                    ]}>
                    {s.label}
                  </Text>
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        {latest?.timedOut && (
          <View style={styles.warnBox}>
            <IconInfo size={14} color={C.warn} />
            <Text style={styles.warnBoxText}>测量超时——请检查电量/电极接触后重试</Text>
          </View>
        )}

        {state === 'connecting' && <ActivityIndicator color={C.primary} style={{ marginTop: 14 }} />}
        {connected && !latest && <Text style={styles.hintCenter}>{t.standOnScale}</Text>}

        {latest && !hasImp && (
          <View style={styles.warnBox}>
            <IconInfo size={14} color={C.warn} />
            <Text style={styles.warnBoxText}>{t.electrodeOff}</Text>
          </View>
        )}
      </LinearGradient>

      {/* 保存按钮（置前方便测量后第一时间点按） */}
      {latest && latest.locked && latest.weight_kg > 0 && (
        <PrimaryButton
          title={t.saveMeasurement}
          onPress={() => setSaveSheet(true)}
          colors={G.accent}
          style={{ marginBottom: 12 }}
        />
      )}

      {/* 身体成分 3x2 指标卡 */}
      {latest && latest.locked && hasImp && comp && (
        <Card>
          <SectionTitle title={t.bodyComp} right={<Badge text={t.localEstimate} color={C.warn} />} />
          <View style={styles.grid}>
            {BC_GRID.filter(([k]) => (comp as unknown as Record<string, number>)[k] !== undefined).map(([k, labelKey, unit, dotColor]) => (
              <View key={k} style={styles.gridCell}>
                <View style={styles.gridCard}>
                  <View style={[styles.gridBar, { backgroundColor: dotColor }]} />
                  <Text style={[styles.gridValue, T.num]}>
                    {(comp as unknown as Record<string, number>)[k]}
                    <Text style={styles.gridUnit}> {unit}</Text>
                  </Text>
                  <Text style={styles.gridLabel}>{(t as unknown as Record<string, string>)[labelKey]}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* 设备信息（合并精简分组卡） */}
      <Card>
        <SectionTitle title={t.deviceInfo} />
        {editing ? (
          <>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholder="设备名称"
              placeholderTextColor={C.textHint}
            />
            <View style={[S.row, { gap: 10, marginTop: 10 }]}>
              <PrimaryButton title={t.save} compact onPress={() => { onRename(name.trim() || device.name); setEditing(false); }} style={{ flex: 1 }} />
              <GhostButton title={t.cancel} compact onPress={() => { setName(device.name); setEditing(false); }} style={{ flex: 1 }} />
            </View>
          </>
        ) : (
          <>
            <InfoRow k={t.devName} v={device.name} onPress={() => setEditing(true)} action={t.rename} first />
            <InfoRow k={t.devModel} v={device.model} />
            <InfoRow k="MAC" v={device.id} mono />
            <InfoRow k={t.devBoundAt} v={device.boundAt} />
            {deviceInfo?.manufacturer ? <InfoRow k={t.manufacturerLabel} v={deviceInfo.manufacturer} /> : null}
            {deviceInfo?.model ? <InfoRow k={t.devModel} v={deviceInfo.model + ' (硬件)'} /> : null}
            {deviceInfo?.firmware ? <InfoRow k={t.firmwareLabel} v={deviceInfo.firmware} /> : null}
            {deviceInfo?.battery != null ? (
              <InfoRow k={t.batteryLabel} v={deviceInfo.battery + '%' + (deviceInfo.battery <= 20 ? ' ⚠' : '')} />
            ) : null}
          </>
        )}
      </Card>

      <GhostButton title={t.unbind} danger compact onPress={onUnbind} style={{ marginTop: 2 }} />

      {/* 保存归属选择 */}
      <Sheet visible={saveSheet} onClose={() => setSaveSheet(false)} title={t.whoIsThis}>
        {units.map((u) => {
          const pf = profiles.find((x) => x.name === u);
          const detail = pf
            ? (pf.sex === 'male' ? t.sexMale : t.sexFemale) + ' · ' + pf.age + ' · ' + pf.heightCm + 'cm'
              + (pf.weightKg ? ' · ' + pf.weightKg + 'kg' : '')
            : null;
          return (
            <ScalePress key={u} onPress={() => { setSaveSheet(false); onSave(u); }} style={styles.unitBtn}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarChar}>{u.slice(0, 1)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.unitText}>{u}</Text>
                {detail ? <Text style={styles.unitDetail}>{detail}</Text> : null}
              </View>
              <IconChevron size={14} color={C.textHint} dir="right" />
            </ScalePress>
          );
        })}
        <GhostButton title={t.cancel} compact onPress={() => setSaveSheet(false)} style={{ marginTop: 8 }} />
      </Sheet>
    </ScrollView>
  );
}

function InfoRow({
  k, v, mono, onPress, action, first,
}: {
  k: string; v: string; mono?: boolean; onPress?: () => void; action?: string; first?: boolean;
}) {
  return (
    <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress} style={[styles.infoRow, first && { borderTopWidth: 0 }]}>
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
  historyToast: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.accentSoft, borderWidth: 1, borderColor: 'rgba(0,217,163,0.35)',
    borderRadius: R.md, paddingVertical: 9, paddingHorizontal: 14, marginBottom: 10,
  },
  historyToastText: { color: C.accent, fontSize: 13, fontWeight: '600' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, marginBottom: 6, alignSelf: 'flex-start' },
  backText: { color: C.primary, fontSize: 15, fontWeight: '600' },
  hero: {
    borderRadius: R.xl, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: C.borderStrong, ...SH.card,
  },
  heroDevice: { fontSize: 15, fontWeight: '700', color: C.text },
  statePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, borderWidth: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statePillText: { fontSize: 11, fontWeight: '700', maxWidth: 180 },
  weightArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginTop: 22, marginBottom: 10 },
  weightValue: { fontSize: 64, fontWeight: '800', color: C.text, letterSpacing: -2.5, lineHeight: 70 },
  weightUnit: { fontSize: 18, fontWeight: '700', color: C.textSub, marginLeft: 6, marginBottom: 10 },
  weightPlaceholder: { fontSize: 64, fontWeight: '800', color: C.textHint, letterSpacing: -2.5, lineHeight: 70 },
  progressWrap: { marginTop: 12 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.09)', overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: C.accent },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  stepDotActive: { backgroundColor: C.primary },
  stepDotDone: { backgroundColor: C.accent },
  stepDotGrey: { backgroundColor: 'rgba(107,115,133,0.35)' },
  stepText: { fontSize: 11, color: 'rgba(168,176,191,0.55)', fontWeight: '600' },
  stepActive: { color: C.primary, fontWeight: '700' },
  stepDone: { color: C.accent },
  stepGrey: { color: 'rgba(107,115,133,0.45)' },
  hintCenter: { textAlign: 'center', fontSize: 12, color: C.textHint, marginTop: 12 },
  warnBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 14, backgroundColor: C.warnSoft, borderRadius: R.sm,
    paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,176,32,0.28)',
  },
  warnBoxText: { fontSize: 12, color: C.warn, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  gridCell: { width: '33.33%', padding: 4 },
  gridCard: {
    backgroundColor: C.surfaceAlt, borderRadius: R.md, paddingVertical: 12, paddingHorizontal: 8,
    alignItems: 'center', borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  gridBar: { position: 'absolute', top: 0, left: 14, right: 14, height: 2, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, opacity: 0.85 },
  gridValue: { fontSize: 18, fontWeight: '800', color: C.text },
  gridUnit: { fontSize: 10, fontWeight: '600', color: C.textHint },
  gridLabel: { fontSize: 11, color: C.textHint, marginTop: 3 },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md,
    paddingHorizontal: 13, paddingVertical: 11, fontSize: 15, color: C.text,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border,
  },
  infoKey: { fontSize: 13, color: C.textHint },
  infoVal: { fontSize: 13, color: C.text, fontWeight: '600', maxWidth: 200 },
  infoAction: { fontSize: 12, color: C.primary, marginLeft: 10, fontWeight: '600' },
  unitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: 13, marginBottom: 8,
    borderWidth: 1, borderColor: C.border,
  },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.primarySoft,
    borderWidth: 1, borderColor: 'rgba(77,141,255,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  avatarChar: { fontSize: 15, fontWeight: '800', color: C.primary },
  unitText: { fontSize: 15, fontWeight: '700', color: C.text },
  unitDetail: { fontSize: 12, color: C.textHint, marginTop: 2 },
});
