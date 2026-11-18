import React, { useMemo, useState } from 'react';
import {
  LayoutAnimation, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { C, G, R, SH, T, S } from './theme';
import { useI18n } from '../i18n';
import { kgTo, unitLabel, formatWeight, type DisplayUnit } from '../storage/unitPref';
import { Card, PrimaryButton, GhostButton, Badge, Sheet, SectionTitle, EmptyState, ScalePress } from './components';
import { IconCalendar, IconChart, IconCheck, IconChevron, IconClose } from './Icons';
import { TrendChart } from './TrendChart';
import type { MeasurementRecord } from '../storage/records';

/** 阻抗是否有效导通：按真实阻抗范围重判 */
function hasRealImpedance(r: MeasurementRecord): boolean {
  const valid = (v: number | null | undefined) => typeof v === 'number' && v > 0 && v < 5000;
  return valid(r.impedance_1) || valid(r.impedance_2);
}

interface Props {
  records: MeasurementRecord[];
  units: string[];
  onSync: (selected: MeasurementRecord[]) => void;
  onDelete: (ids: string[]) => void;
  onTransfer: (ids: string[], unit: string) => void;
  profiles?: { name: string; sex: string; age: number; heightCm: number }[];
  activeUserName?: string;
  syncMsg: string;
  exporting: boolean;
  goals: Record<string, number>;
  onSetGoal: (unit: string, kg: number | null) => void;
  displayUnit?: DisplayUnit;
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

export function DataPage({
  records, units, onSync, onDelete, onTransfer, profiles = [], activeUserName,
  syncMsg, exporting, goals, onSetGoal, displayUnit = 'kg',
}: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<'today' | '24h' | '7d' | '30d' | 'all' | 'custom'>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [transferSheet, setTransferSheet] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const PAGE_SIZE = 10;
  const [pickDate, setPickDate] = useState(false);
  const [detail, setDetail] = useState<MeasurementRecord | null>(null);
  const [goalSheet, setGoalSheet] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const dates = useMemo(() => {
    const s = new Set<string>();
    records.forEach((r) => s.add(r.time.slice(0, 10)));
    return Array.from(s).sort().reverse();
  }, [records]);

  const userRecords = useMemo(
    () => records.filter((r) => !activeUserName || r.unit === activeUserName),
    [records, activeUserName],
  );

  const filtered = useMemo(() => {
    const now = new Date();
    const parseTime = (tm: string) => new Date(tm.replace(' ', 'T')).getTime();
    const user = userRecords;
    switch (range) {
      case 'today': {
        const pad = (n: number) => String(n).padStart(2, '0');
        const today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
        return user.filter((r) => r.time.slice(0, 10) === today);
      }
      case '24h':
        return user.filter((r) => parseTime(r.time) >= now.getTime() - 24 * 3600 * 1000);
      case '7d':
        return user.filter((r) => parseTime(r.time) >= now.getTime() - 7 * 24 * 3600 * 1000);
      case '30d':
        return user.filter((r) => parseTime(r.time) >= now.getTime() - 30 * 24 * 3600 * 1000);
      case 'custom':
        return user.filter((r) => {
          const d = r.time.slice(0, 10);
          return (!customFrom || d >= customFrom) && (!customTo || d <= customTo);
        });
      default:
        return user;
    }
  }, [userRecords, range, customFrom, customTo]);

  const selectable = filtered.filter((r) => !r.syncedAt);
  const toggle = (r: MeasurementRecord) => {
    const next = new Set(selected);
    if (next.has(r.id)) next.delete(r.id); else next.add(r.id);
    setSelected(next);
  };
  const toggleAll = () => {
    const pool = selectable.length > 0 ? selectable : filtered;
    if (!pool.length) return;
    const allSel = pool.every((r) => selected.has(r.id));
    setSelected(allSel ? new Set() : new Set(pool.map((r) => r.id)));
  };

  const goalUnit = activeUserName || units[0] || '';
  const latestRec = filtered.length ? filtered.reduce((a, b) => (a.time > b.time ? a : b)) : null;
  const unsyncedCount = userRecords.filter((r) => !r.syncedAt).length;
  const targetUnits = profiles.length > 0 ? profiles.map((p) => p.name) : units;
  const uText = unitLabel(displayUnit);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.wrap}
        contentContainerStyle={{ paddingBottom: selected.size > 0 ? 150 : 96 }}
        showsVerticalScrollIndicator={false}>

        {/* 紧凑概览 Hero */}
        {latestRec && (
          <LinearGradient colors={G.hero as never} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroLabel}>{t.latestRecord} · {activeUserName || latestRec.unit}</Text>
              <View style={[S.row, { alignItems: 'flex-end', marginTop: 4 }]}>
                <Text style={[styles.heroWeight, T.num]}>{formatWeight(latestRec.weight_kg, displayUnit)}</Text>
                <Text style={styles.heroUnit}>{uText}</Text>
              </View>
              <Text style={styles.heroTime}>{latestRec.time}</Text>
            </View>
            <View style={styles.heroRight}>
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatVal, T.num]}>{userRecords.length}</Text>
                <Text style={styles.heroStatLbl}>{t.totalRecords}</Text>
              </View>
              <View style={styles.heroStatDiv} />
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatVal, T.num, { color: unsyncedCount > 0 ? C.warn : C.accent }]}>
                  {unsyncedCount}
                </Text>
                <Text style={styles.heroStatLbl}>{t.unsynced}</Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* 趋势图 */}
        <TrendChart
          displayUnit={displayUnit}
          records={filtered}
          unitLabel={goalUnit}
          targetKg={goals[goalUnit] ?? null}
          onEditTarget={() => {
            setGoalInput(goals[goalUnit] !== undefined ? String(kgTo(goals[goalUnit], displayUnit)) : '');
            setGoalSheet(true);
          }}
        />

        {/* 轻量横向时间范围胶囊条 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rangeStrip}>
          {([
            ['today', t.rangeToday],
            ['24h', t.range24h],
            ['7d', t.range7d],
            ['30d', t.range30d],
            ['all', t.rangeAll],
          ] as const).map(([k, label]) => (
            <Chip key={k} label={label} active={range === k} onPress={() => setRange(k)} />
          ))}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setPickDate(true)}
            style={[styles.chip, styles.chipCustom, range === 'custom' && styles.chipActive]}>
            <IconCalendar size={12} color={range === 'custom' ? '#fff' : C.primary} />
            <Text style={[styles.chipText, range === 'custom' && styles.chipTextActive]}>
              {range === 'custom' ? ((customFrom || '..') + ' ~ ' + (customTo || '..')) : t.customRange}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {syncMsg ? (
          <View style={styles.syncBanner}>
            <Text style={styles.syncMsg}>{syncMsg}</Text>
          </View>
        ) : null}

        {/* 记录列表标题 */}
        <SectionTitle
          title={t.records + ' · ' + filtered.length}
          right={
            filtered.length > 0 ? (
              <TouchableOpacity onPress={toggleAll} activeOpacity={0.7}>
                <Text style={styles.link}>
                  {(selectable.length > 0 ? selectable : filtered).every((r) => selected.has(r.id))
                    ? t.unselectAll
                    : t.selectAllUnsynced}
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />

        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={<IconChart size={26} color={C.textHint} />}
              title={t.noData}
              desc={t.noDataDesc}
            />
          </Card>
        ) : (
          filtered.slice().reverse().slice(0, expanded ? filtered.length : PAGE_SIZE).map((r) => {
            const pushed = !!r.syncedAt;
            const isSel = selected.has(r.id);
            const bc = r.body_composition as Record<string, number> | null;
            const hasImp = hasRealImpedance(r);
            return (
              <ScalePress key={r.id} scaleTo={0.985} onPress={() => setDetail(r)} style={{ marginBottom: 8 }}>
                <View style={[styles.recCard, isSel && styles.recCardSel]}>
                  <TouchableOpacity
                    onPress={() => toggle(r)}
                    hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                    style={styles.checkHit}>
                    <View style={[styles.checkbox, isSel && styles.checkboxOn]}>
                      {isSel && <IconCheck size={12} color="#fff" />}
                    </View>
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <View style={S.rowBetween}>
                      <View style={[S.row, { alignItems: 'baseline' }]}>
                        <Text style={[styles.recWeight, T.num]}>{formatWeight(r.weight_kg, displayUnit)}</Text>
                        <Text style={styles.recKg}>{uText}</Text>
                        {bc && hasImp && (
                          <Text style={styles.recFat}> · {t.bcFat} {bc.body_fat_percent}%</Text>
                        )}
                      </View>
                      <View style={[S.row, { gap: 5 }]}>
                        {pushed && <Badge text={t.synced} color={C.accent} />}
                        {!hasImp && <Badge text={t.electrodeOffShort} color={C.warn} />}
                      </View>
                    </View>
                    <Text style={styles.recTime}>{r.time}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => onDelete([r.id])}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.delHit}>
                    <IconClose size={13} color={C.textHint} />
                  </TouchableOpacity>
                </View>
              </ScalePress>
            );
          })
        )}

        {filtered.length > PAGE_SIZE && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setExpanded(!expanded);
            }}
            style={styles.expandBtn}>
            <Text style={styles.expandText}>
              {expanded ? t.collapse : t.expandMore + ' (' + (filtered.length - PAGE_SIZE) + ')'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* 底部悬浮批量操作条（选中即出现，不用翻找按钮） */}
      {selected.size > 0 && (
        <View style={styles.floatingBar}>
          <View style={styles.floatingCountBox}>
            <Text style={styles.floatingCount}>{selected.size}</Text>
          </View>
          <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
            <PrimaryButton
              title={exporting ? t.pushing : t.pushSelected}
              compact
              onPress={() => onSync(userRecords.filter((r) => selected.has(r.id) && !r.syncedAt))}
              disabled={exporting}
              loading={exporting}
              colors={G.primary}
              style={{ flex: 1.2 }}
            />
            <GhostButton
              title={t.transferTo}
              compact
              onPress={() => setTransferSheet(true)}
              style={{ flex: 1 }}
            />
            <GhostButton
              title={t.delete}
              compact
              onPress={() => { onDelete(Array.from(selected)); setSelected(new Set()); }}
              danger
              style={{ flex: 0.85 }}
            />
          </View>
        </View>
      )}

      {/* 目标体重设置 */}
      <Sheet visible={goalSheet} onClose={() => setGoalSheet(false)} title={t.setGoal + ' · ' + goalUnit + ' (' + uText + ')'}>
        <Text style={styles.goalHint}>{t.goalHint}</Text>
        <TextInput
          value={goalInput}
          onChangeText={setGoalInput}
          placeholder="60"
          placeholderTextColor={C.textHint}
          keyboardType="decimal-pad"
          style={styles.goalInput}
          maxLength={6}
        />
        <View style={[S.row, { gap: 10, marginTop: 14 }]}>
          <PrimaryButton
            title={t.saveGoal}
            compact
            onPress={() => {
              const v = parseFloat(goalInput.replace(',', '.'));
              if (Number.isFinite(v) && v > 0 && v < 500) {
                const kg = displayUnit === 'lb' ? v / 2.2046226 : displayUnit === 'jin' ? v / 2 : v;
                onSetGoal(goalUnit, Math.round(kg * 100) / 100);
                setGoalSheet(false);
              }
            }}
            colors={G.accent}
            style={{ flex: 1 }}
          />
          <GhostButton
            title={t.clearGoal}
            compact
            onPress={() => { onSetGoal(goalUnit, null); setGoalInput(''); setGoalSheet(false); }}
            danger
            style={{ flex: 1 }}
          />
        </View>
        <GhostButton title={t.cancel} compact onPress={() => setGoalSheet(false)} style={{ marginTop: 10 }} />
      </Sheet>

      {/* 自定义日期范围 */}
      <Sheet visible={pickDate} onClose={() => setPickDate(false)} title={t.customRange}>
        <Text style={styles.goalHint}>{t.rangeHint}</Text>
        <Text style={S.label}>{t.rangeFrom}</Text>
        <TextInput
          value={customFrom}
          onChangeText={setCustomFrom}
          placeholder="2026-11-01"
          placeholderTextColor={C.textHint}
          style={styles.goalInput}
        />
        <Text style={[S.label, { marginTop: 10 }]}>{t.rangeTo}</Text>
        <TextInput
          value={customTo}
          onChangeText={setCustomTo}
          placeholder="2026-11-18"
          placeholderTextColor={C.textHint}
          style={styles.goalInput}
        />
        <ScrollView style={{ maxHeight: 160, marginTop: 10 }}>
          {dates.length === 0 && <Text style={S.hint}>{t.noData}</Text>}
          {dates.map((dd) => (
            <TouchableOpacity key={dd} style={styles.dateRow} onPress={() => {
              if (!customFrom || customTo) { setCustomFrom(dd); setCustomTo(''); }
              else { setCustomTo(dd); }
            }}>
              <Text style={styles.dateText}>{dd}</Text>
              <Text style={styles.dateCount}>{userRecords.filter((r) => r.time.slice(0, 10) === dd).length} {t.records}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <PrimaryButton title={t.applyRange} compact onPress={() => { setRange('custom'); setPickDate(false); }} style={{ marginTop: 12 }} />
        <GhostButton title={t.close} compact onPress={() => setPickDate(false)} style={{ marginTop: 8 }} />
      </Sheet>

      {/* 转移所有者 */}
      <Sheet visible={transferSheet} onClose={() => setTransferSheet(false)} title={t.transferTo}>
        <Text style={styles.goalHint}>{t.transferHint}</Text>
        {targetUnits.map((u) => {
          const pf = profiles.find((x) => x.name === u);
          const desc = pf
            ? (pf.sex === 'male' ? t.sexMale : t.sexFemale) + ' · ' + pf.age + ' · ' + pf.heightCm + 'cm'
            : null;
          return (
            <ScalePress
              key={u}
              onPress={() => {
                onTransfer(Array.from(selected), u);
                setSelected(new Set());
                setTransferSheet(false);
              }}
              style={styles.transferChip}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarChar}>{u.slice(0, 1)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.transferChipText}>{u}</Text>
                {desc ? <Text style={styles.transferChipDesc}>{desc}</Text> : null}
              </View>
              <IconChevron size={14} color={C.textHint} dir="right" />
            </ScalePress>
          );
        })}
        <GhostButton title={t.close} compact onPress={() => setTransferSheet(false)} style={{ marginTop: 10 }} />
      </Sheet>

      {/* 详情页 Modal */}
      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)} statusBarTranslucent={false}>
        <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View style={styles.fullHeader}>
            <TouchableOpacity onPress={() => setDetail(null)} style={styles.backHit}>
              <IconChevron size={15} color={C.primary} dir="left" />
              <Text style={styles.backText}>{t.back}</Text>
            </TouchableOpacity>
            <Text style={styles.fullTitle}>{t.detailTitle}</Text>
            <View style={{ width: 64 }} />
          </View>
          {detail && (() => {
            const bc = detail.body_composition as Record<string, number> | null;
            return (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 48 }} showsVerticalScrollIndicator>
                <LinearGradient colors={G.hero as never} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.detHero}>
                  <Text style={styles.detMeta}>{detail.unit} · {detail.time}</Text>
                  <Text style={[styles.detWeight, T.num]}>
                    {formatWeight(detail.weight_kg, displayUnit)}
                    <Text style={styles.detKg}> {uText}</Text>
                  </Text>
                </LinearGradient>

                <View style={styles.detCard}>
                  <DetRow k={t.connectState} v={hasRealImpedance(detail) ? t.electrodeOn : t.electrodeOffShort} vColor={hasRealImpedance(detail) ? C.accent : C.warn} first />
                  {detail.adcs && detail.adcs.length > 0 && (
                    <DetRow k={t.impedanceRaw} v={JSON.stringify(detail.adcs)} vColor={hasRealImpedance(detail) ? C.text : C.textHint} />
                  )}
                  <DetRow k={t.pushStatus} v={detail.syncedAt ? t.synced + ' ' + detail.syncedAt : t.notSynced} vColor={detail.syncedAt ? C.accent : C.textHint} />
                </View>

                {bc && hasRealImpedance(detail) ? (
                  <View style={[styles.detCard, { marginTop: 12 }]}>
                    <Text style={styles.detSection}>{t.bodyCompLocal}</Text>
                    {BC_LABELS.filter(([k]) => bc[k] !== undefined && bc[k] !== null).map(([k, label, unit]) => (
                      <DetRow key={k} k={label} v={bc[k] + unit} />
                    ))}
                    {bc.model ? <DetRow k={t.algorithm} v={String(bc.model)} /> : null}
                  </View>
                ) : (
                  <View style={[styles.detCard, { marginTop: 12 }]}>
                    <Text style={styles.detNote}>{t.compUnavailable}</Text>
                  </View>
                )}
              </ScrollView>
            );
          })()}
        </View>
      </Modal>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DetRow({ k, v, vColor, first }: { k: string; v: string; vColor?: string; first?: boolean }) {
  return (
    <View style={[styles.detRow, first && { borderTopWidth: 0 }]}>
      <Text style={styles.detKey}>{k}</Text>
      <Text style={[styles.detVal, T.num, vColor ? { color: vColor } : null]} numberOfLines={2}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  wrap: { flex: 1 },
  hero: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: R.xl, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: C.borderStrong, ...SH.card,
  },
  heroLeft: { flex: 1 },
  heroLabel: { fontSize: 12, color: C.textSub, fontWeight: '600' },
  heroWeight: { fontSize: 40, fontWeight: '800', color: C.text, letterSpacing: -1.5, lineHeight: 46 },
  heroUnit: { fontSize: 15, fontWeight: '700', color: C.textSub, marginLeft: 5, marginBottom: 6 },
  heroTime: { fontSize: 11, color: C.textHint, marginTop: 2 },
  heroRight: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(11,13,18,0.45)',
    borderRadius: R.md, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border,
  },
  heroStatItem: { alignItems: 'center', minWidth: 44 },
  heroStatVal: { fontSize: 16, fontWeight: '800', color: C.text },
  heroStatLbl: { fontSize: 10, color: C.textHint, marginTop: 2 },
  heroStatDiv: { width: 1, height: 22, backgroundColor: C.border, marginHorizontal: 10 },
  rangeStrip: { gap: 8, paddingBottom: 12, paddingTop: 2 },
  chip: {
    backgroundColor: C.surface, borderRadius: R.pill, paddingVertical: 7, paddingHorizontal: 13,
    borderWidth: 1, borderColor: C.border,
  },
  chipCustom: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 12, color: C.textSub, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  syncBanner: {
    marginBottom: 10, backgroundColor: C.accentSoft, borderRadius: R.md,
    paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(0,217,163,0.3)',
  },
  syncMsg: { fontSize: 12, color: C.accent, lineHeight: 18, fontWeight: '600' },
  link: { fontSize: 12, color: C.primary, fontWeight: '600' },
  recCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface,
    borderRadius: R.md, paddingVertical: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: C.border,
  },
  recCardSel: { borderColor: C.primary, backgroundColor: 'rgba(77,141,255,0.08)' },
  checkHit: { paddingRight: 10, paddingVertical: 4 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: C.borderStrong,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg,
  },
  checkboxOn: { backgroundColor: C.primary, borderColor: C.primary },
  recWeight: { fontSize: 19, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  recKg: { fontSize: 12, fontWeight: '600', color: C.textHint, marginLeft: 3 },
  recFat: { fontSize: 12, color: C.textSub, marginLeft: 4 },
  recTime: { fontSize: 11, color: C.textHint, marginTop: 2 },
  delHit: { paddingLeft: 10, paddingVertical: 6 },
  expandBtn: {
    marginTop: 6, marginBottom: 10, paddingVertical: 11, borderRadius: R.md,
    borderWidth: 1, borderColor: C.borderStrong, alignItems: 'center',
    backgroundColor: C.surface,
  },
  expandText: { color: C.primary, fontSize: 13, fontWeight: '700' },
  floatingBar: {
    position: 'absolute', left: 0, right: 0, bottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(20, 23, 32, 0.96)', borderRadius: R.lg,
    padding: 10, borderWidth: 1, borderColor: C.borderStrong, ...SH.glow,
  },
  floatingCountBox: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  floatingCount: { color: C.primary, fontSize: 13, fontWeight: '800' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.border },
  dateText: { fontSize: 14, color: C.text },
  dateCount: { fontSize: 12, color: C.textHint },
  fullHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backHit: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 64 },
  backText: { color: C.primary, fontSize: 15, fontWeight: '600' },
  fullTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  detHero: {
    alignItems: 'center', paddingVertical: 20, marginBottom: 14,
    borderRadius: R.xl, borderWidth: 1, borderColor: C.borderStrong,
  },
  detWeight: { fontSize: 42, fontWeight: '800', color: C.text, letterSpacing: -1.5, marginTop: 4 },
  detKg: { fontSize: 16, color: C.textSub, fontWeight: '600' },
  detMeta: { fontSize: 12, color: C.textSub },
  detCard: { backgroundColor: C.surface, borderRadius: R.lg, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor: C.border },
  detRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.border },
  detKey: { fontSize: 13, color: C.textHint },
  detVal: { fontSize: 13, color: C.text, fontWeight: '600', maxWidth: '62%', textAlign: 'right' },
  detSection: { fontSize: 12, color: C.primary, fontWeight: '700', paddingTop: 10, paddingBottom: 4, letterSpacing: 0.4 },
  detNote: { fontSize: 12, color: C.warn, paddingVertical: 12 },
  goalHint: { fontSize: 12, color: C.textSub, lineHeight: 18, marginBottom: 10 },
  transferChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surfaceAlt, borderRadius: R.md, borderWidth: 1, borderColor: C.border,
    paddingVertical: 11, paddingHorizontal: 12, marginTop: 8,
  },
  avatarCircle: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarChar: { fontSize: 14, fontWeight: '800', color: C.primary },
  transferChipText: { fontSize: 15, color: C.text, fontWeight: '700' },
  transferChipDesc: { fontSize: 11, color: C.textHint, marginTop: 2 },
  goalInput: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md,
    padding: 12, fontSize: 18, color: C.text, fontWeight: '700', textAlign: 'center', marginTop: 4,
  },
});
