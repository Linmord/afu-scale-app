import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { C, G, R, SH, T, S } from './theme';
import { useI18n } from '../i18n';
import { Card, PrimaryButton, GhostButton, Badge, Sheet, SectionTitle, EmptyState, StatPill } from './components';
import { TrendChart } from './TrendChart';
import type { MeasurementRecord } from '../storage/records';

interface Props {
  records: MeasurementRecord[];
  units: string[];
  onSync: (selected: MeasurementRecord[]) => void;
  onDelete: (id: string) => void;
  syncMsg: string;
  exporting: boolean;
  goals: Record<string, number>;
  onSetGoal: (unit: string, kg: number | null) => void;
}

const BC_LABELS: [string, string, string][] = [
  ['body_fat_percent', '体脂率', '%'], ['fat_mass_kg', '脂肪量', 'kg'],
  ['muscle_percent', '肌肉率', '%'], ['muscle_mass_kg', '肌肉量', 'kg'],
  ['water_percent', '水分率', '%'], ['water_mass_kg', '水分量', 'kg'],
  ['protein_percent', '蛋白质', '%'], ['protein_mass_kg', '蛋白质量', 'kg'],
  ['bone_percent', '骨量率', '%'], ['bone_mass_kg', '骨量', 'kg'],
  ['skeletal_muscle_percent', '骨骼肌率', '%'], ['skeletal_muscle_mass_kg', '骨骼肌量', 'kg'],
  ['subcutaneous_fat_percent', '皮下脂肪率', '%'], ['subcutaneous_fat_mass_kg', '皮下脂肪量', 'kg'],
  ['fat_free_mass_kg', '去脂体重', 'kg'],
];

export function DataPage({ records, units, onSync, onDelete, syncMsg, exporting, goals, onSetGoal }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [activeUnit, setActiveUnit] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pickDate, setPickDate] = useState(false);
  const [detail, setDetail] = useState<MeasurementRecord | null>(null);
  const [goalSheet, setGoalSheet] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const dates = useMemo(() => {
    const s = new Set<string>();
    records.forEach((r) => s.add(r.time.slice(0, 10)));
    return Array.from(s).sort().reverse();
  }, [records]);

  const filtered = useMemo(() => records.filter((r) =>
    (!activeUnit || r.unit === activeUnit) && (!dateFilter || r.time.slice(0, 10) === dateFilter)
  ), [records, activeUnit, dateFilter]);

  const selectable = filtered.filter((r) => !r.syncedAt);
  const toggle = (r: MeasurementRecord) => {
    if (r.syncedAt) return;
    const next = new Set(selected);
    next.has(r.id) ? next.delete(r.id) : next.add(r.id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (!selectable.length) return;
    const allSel = selectable.every((r) => selected.has(r.id));
    setSelected(allSel ? new Set() : new Set(selectable.map((r) => r.id)));
  };

  const goalUnit = activeUnit || units[0] || '';
  const unsynced = filtered.filter((r) => !r.syncedAt).length;
  const latestRec = filtered[0];
  const byUnit = units.map((u) => ({ unit: u, count: records.filter((r) => r.unit === u).length }));

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
      {/* 概览卡 */}
      {latestRec && (
        <LinearGradient colors={G.hero as never} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroLabel}>{t.latestRecord} · {latestRec.unit}</Text>
          <View style={[S.row, { alignItems: 'flex-end', marginTop: 8 }]}>
            <Text style={styles.heroWeight}>{latestRec.weight_kg.toFixed(1)}</Text>
            <Text style={styles.heroUnit}>kg</Text>
          </View>
          <Text style={styles.heroTime}>{latestRec.time}</Text>
          <View style={[S.row, { marginTop: 16 }]}>
            <StatPill label={t.totalRecords} value={String(records.length)} />
            <StatPill label={t.unsynced} value={String(records.filter((r) => !r.syncedAt).length)} color={C.warn} />
            <StatPill label={t.unitsLabel} value={String(units.length)} color={C.primary} />
          </View>
        </LinearGradient>
      )}

      {/* 趋势图 */}
      <TrendChart
        records={activeUnit ? records.filter((r) => r.unit === activeUnit) : records}
        unitLabel={goalUnit}
        targetKg={goals[goalUnit] ?? null}
        onEditTarget={() => {
          setGoalInput(goals[goalUnit] !== undefined ? String(goals[goalUnit]) : '');
          setGoalSheet(true);
        }}
      />

      {/* 筛选 */}
      <Card>
        <View style={S.rowBetween}>
          <Text style={S.label}>{t.filterByUnit}</Text>
          <TouchableOpacity onPress={() => setPickDate(true)}>
            <Text style={styles.link}>{dateFilter || t.byDate} ▾</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chipRow}>
          <Chip label={`${t.all} ${records.length}`} active={activeUnit === null} onPress={() => setActiveUnit(null)} />
          {byUnit.map((b) => (
            <Chip key={b.unit} label={`${b.unit} ${b.count}`} active={activeUnit === b.unit} onPress={() => setActiveUnit(b.unit)} />
          ))}
        </View>
        {dateFilter && (
          <TouchableOpacity onPress={() => setDateFilter(null)} style={{ marginTop: 10 }}>
            <Text style={styles.clear}>× {t.clearDateFilter}</Text>
          </TouchableOpacity>
        )}
      </Card>

      {/* 列表 */}
      <SectionTitle
        title={`${t.records} ${filtered.length}`}
        right={
          <TouchableOpacity onPress={toggleAll}>
            <Text style={styles.link}>
              {selectable.length > 0 && selectable.every((r) => selected.has(r.id)) ? t.unselectAll : t.selectAllUnsynced}
            </Text>
          </TouchableOpacity>
        }
      />

      {filtered.length === 0 ? (
        <Card><EmptyState icon="📊" title={t.noData} desc={t.noDataDesc} /></Card>
      ) : (
        filtered.slice().reverse().map((r) => {
          const pushed = !!r.syncedAt;
          const isSel = selected.has(r.id);
          const bc = r.body_composition as Record<string, number> | null;
          return (
            <TouchableOpacity key={r.id} activeOpacity={0.8} onPress={() => setDetail(r)}>
              <View style={[styles.recCard, isSel && styles.recCardSel]}>
                <TouchableOpacity onPress={() => toggle(r)} style={styles.checkHit}>
                  <View style={[styles.checkbox, pushed && styles.checkboxOff, isSel && styles.checkboxOn]}>
                    {isSel && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <View style={[S.row, { marginBottom: 3 }]}>
                    <Text style={styles.recUnit}>{r.unit}</Text>
                    {pushed && <Badge text={t.synced} color={C.accent} />}
                    {!r.electrode_on && <Badge text={t.electrodeOffShort} color={C.warn} />}
                  </View>
                  <View style={S.row}>
                    <Text style={styles.recWeight}>{r.weight_kg.toFixed(2)}</Text>
                    <Text style={styles.recKg}>kg</Text>
                    {bc && r.electrode_on && (
                      <Text style={styles.recFat}>  {t.bcFat} {bc.body_fat_percent}%</Text>
                    )}
                  </View>
                  <Text style={styles.recTime}>{r.time}</Text>
                </View>

                <TouchableOpacity onPress={() => onDelete(r.id)} style={styles.delHit}>
                  <Text style={styles.del}>✕</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      <View style={{ height: 12 }} />
      <PrimaryButton
        title={exporting ? t.pushing : `${t.pushSelected} ${selected.size}`}
        onPress={() => onSync(records.filter((r) => selected.has(r.id) && !r.syncedAt))}
        disabled={selected.size === 0}
        loading={exporting}
        colors={G.primary}
      />

      {syncMsg ? <Card style={{ marginTop: 12 }}><Text style={styles.syncMsg}>{syncMsg}</Text></Card> : null}

      {/* 目标体重设置 */}
      <Sheet visible={goalSheet} onClose={() => setGoalSheet(false)} title={`${t.setGoal} · ${goalUnit}`}>
        <Text style={styles.goalHint}>
        {t.goalHint}
        </Text>
        <TextInput
          value={goalInput}
          onChangeText={setGoalInput}
          placeholder={t.goalPlaceholder}
          placeholderTextColor={C.textHint}
          keyboardType="decimal-pad"
          style={styles.goalInput}
        />
        <View style={[S.row, { gap: 10, marginTop: 14 }]}>
          <PrimaryButton
            title={t.saveGoal}
            onPress={() => {
              const v = parseFloat(goalInput.replace(',', '.'));
              if (Number.isFinite(v) && v > 0 && v < 500) {
                onSetGoal(goalUnit, v);
                setGoalSheet(false);
              }
            }}
            colors={G.accent}
            style={{ flex: 1 }}
          />
          <GhostButton
            title={t.clearGoal}
            onPress={() => { onSetGoal(goalUnit, null); setGoalInput(''); setGoalSheet(false); }}
            style={{ flex: 1 }}
          />
        </View>
        <GhostButton title={t.cancel} onPress={() => setGoalSheet(false)} style={{ marginTop: 10 }} />
      </Sheet>

      {/* 日期 */}
      <Sheet visible={pickDate} onClose={() => setPickDate(false)} title={t.selectDate}>
        <ScrollView style={{ maxHeight: 340 }}>
          {dates.length === 0 && <Text style={S.hint}>{t.noData}</Text>}
          {dates.map((d) => (
            <TouchableOpacity key={d} style={styles.dateRow} onPress={() => { setDateFilter(d); setPickDate(false); }}>
              <Text style={[styles.dateText, dateFilter === d && { color: C.primary, fontWeight: '700' }]}>{d}</Text>
              <Text style={styles.dateCount}>{records.filter((r) => r.time.slice(0, 10) === d).length} {t.records}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <GhostButton title={t.close} onPress={() => setPickDate(false)} style={{ marginTop: 12 }} />
      </Sheet>

      {/* 详情：用 Modal 实现真正全屏覆盖（不受顶栏/底栏限制） */}
      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)} statusBarTranslucent={false}>
        <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View style={styles.fullHeader}>
            <TouchableOpacity onPress={() => setDetail(null)} style={styles.backHit}>
              <Text style={styles.backText}>‹ {t.back}</Text>
            </TouchableOpacity>
            <Text style={styles.fullTitle}> {t.detailTitle}</Text>
            <View style={{ width: 60 }} />
          </View>
          {detail && (() => {
            const bc = detail.body_composition as Record<string, number> | null;
            return (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
                showsVerticalScrollIndicator>
                <View style={styles.detHero}>
                  <Text style={styles.detWeight}>{detail.weight_kg.toFixed(2)}<Text style={styles.detKg}> kg</Text></Text>
                  <Text style={styles.detMeta}>{detail.unit} · {detail.time}</Text>
                </View>

                <View style={styles.detCard}>
                  <DetRow k={t.connectState} v={detail.electrode_on ? t.electrodeOn : t.electrodeOffShort} vColor={detail.electrode_on ? C.accent : C.warn} />
                  {detail.adcs && detail.adcs.length > 0 && (
                    <DetRow k={t.impedanceRaw} v={JSON.stringify(detail.adcs)} />
                  )}
                  <DetRow k={t.pushStatus} v={detail.syncedAt ? t.synced + detail.syncedAt : t.notSynced} vColor={detail.syncedAt ? C.accent : C.textHint} />
                </View>

                {bc ? (
                  <View style={[styles.detCard, { marginTop: 14 }]}>
                    <Text style={styles.detSection}> {t.bodyCompLocal}</Text>
                    {BC_LABELS.filter(([k]) => bc[k] !== undefined && bc[k] !== null).map(([k, label, unit]) => (
                      <DetRow key={k} k={label} v={`${bc[k]}${unit}`} />
                    ))}
                    {bc.model ? <DetRow k={t.algorithm} v={String(bc.model)} /> : null}
                  </View>
                ) : (
                  <View style={[styles.detCard, { marginTop: 14 }]}>
                    <Text style={styles.detNote}> {t.compUnavailable}</Text>
                  </View>
                )}
              </ScrollView>
            );
          })()}
        </View>
      </Modal>

    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
function DetRow({ k, v, vColor }: { k: string; v: string; vColor?: string }) {
  return (
    <View style={styles.detRow}>
      <Text style={styles.detKey}>{k}</Text>
      <Text style={[styles.detVal, vColor ? { color: vColor } : null]} numberOfLines={2}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  hero: { borderRadius: R.xl, padding: 22, marginBottom: 14, borderWidth: 1, borderColor: C.border, ...SH.card },
  heroLabel: { fontSize: 13, color: C.textSub, fontWeight: '600' },
  heroWeight: { fontSize: 54, fontWeight: '800', color: C.text, letterSpacing: -2, lineHeight: 60 },
  heroUnit: { fontSize: 18, fontWeight: '700', color: C.textSub, marginLeft: 6, marginBottom: 10 },
  heroTime: { fontSize: 12, color: C.textHint, marginTop: 2 },
  link: { fontSize: 13, color: C.primary, fontWeight: '600' },
  clear: { fontSize: 12, color: C.danger },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { backgroundColor: C.surfaceAlt, borderRadius: R.pill, paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13, color: C.textSub, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  recCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface,
    borderRadius: R.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  recCardSel: { borderColor: C.primary, backgroundColor: 'rgba(77,141,255,0.08)' },
  checkHit: { paddingRight: 12, paddingVertical: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: C.primary, borderColor: C.primary },
  checkboxOff: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  recUnit: { fontSize: 12, color: C.primary, fontWeight: '700', marginRight: 8 },
  recWeight: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  recKg: { fontSize: 12, fontWeight: '600', color: C.textHint, marginLeft: 3 },
  recFat: { fontSize: 12, color: C.textSub, marginLeft: 6 },
  recTime: { fontSize: 11, color: C.textHint, marginTop: 3 },
  delHit: { paddingLeft: 10, paddingVertical: 8 },
  del: { fontSize: 16, color: C.textHint },
  syncMsg: { fontSize: 13, color: C.accent, lineHeight: 19 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.border },
  dateText: { fontSize: 15, color: C.text },
  dateCount: { fontSize: 12, color: C.textHint },
  fullOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: C.bg, zIndex: 100 },
  fullHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backHit: { width: 60 },
  backText: { color: C.primary, fontSize: 15, fontWeight: '600' },
  fullTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  detCard: { backgroundColor: C.surface, borderRadius: R.md, padding: 14, borderWidth: 1, borderColor: C.border },
  detHero: { alignItems: 'center', paddingVertical: 14, marginBottom: 14 },
  detWeight: { fontSize: 40, fontWeight: '800', color: C.text, letterSpacing: -1.5 },
  detKg: { fontSize: 16, color: C.textSub, fontWeight: '600' },
  detMeta: { fontSize: 12, color: C.textHint, marginTop: 4 },
  detRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border },
  detKey: { fontSize: 13, color: C.textHint },
  detVal: { fontSize: 13, color: C.text, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  detSection: { fontSize: 13, color: C.primary, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  detNote: { fontSize: 12, color: C.warn, marginTop: 10 },
  goalHint: { fontSize: 12, color: C.textSub, lineHeight: 18, marginBottom: 12 },
  goalInput: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md,
    padding: 14, fontSize: 20, color: C.text, fontWeight: '700', textAlign: 'center',
  },
});
