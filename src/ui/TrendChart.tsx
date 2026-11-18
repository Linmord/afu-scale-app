import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C, R, SH, T } from './theme';
import { useI18n } from '../i18n';
import { kgTo, unitLabel, type DisplayUnit } from '../storage/unitPref';
import type { MeasurementRecord } from '../storage/records';

/**
 * 体重趋势图：纯 View 几何折线 + 点选查看单次数据交互
 */

const CHART_H = 186;
const PAD_L = 46;
const PAD_R = 16;
const PAD_T = 22;
const PAD_B = 26;

interface Point { date: string; kg: number; time: string }

const MIN_VALID_KG = 10;
const MAX_VALID_KG = 250;

function aggregate(records: MeasurementRecord[]): Point[] {
  return records
    .filter((r) => r.weight_kg >= MIN_VALID_KG && r.weight_kg <= MAX_VALID_KG)
    .slice()
    .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
    .slice(-30)
    .map((r) => ({ date: r.time.slice(0, 10), kg: r.weight_kg, time: r.time }));
}

export function TrendChart({
  records, unitLabel: unitLabelText, targetKg, onEditTarget, displayUnit,
}: {
  records: MeasurementRecord[];
  unitLabel: string;
  targetKg: number | null;
  onEditTarget: () => void;
  displayUnit?: DisplayUnit;
}) {
  const { t } = useI18n();
  const [width, setWidth] = useState(0);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const unit = displayUnit ?? 'kg';
  const ptsRaw = useMemo(() => aggregate(records), [records]);
  const pts = useMemo(() => ptsRaw.map((p) => ({ date: p.date, time: p.time, kg: kgTo(p.kg, unit) })), [ptsRaw, unit]);

  const stats = useMemo(() => {
    if (pts.length === 0) return null;
    const kgs = pts.map((p) => p.kg);
    const first = kgs[0];
    const last = kgs[kgs.length - 1];
    const min = Math.min(...kgs);
    const max = Math.max(...kgs);
    return { first, last, min, max, delta: last - first };
  }, [pts]);

  const targetConverted = targetKg !== null ? kgTo(targetKg, unit) : null;
  const layout = useMemo(() => {
    if (!stats || width <= PAD_L + PAD_R + 20) return null;
    const innerW = width - PAD_L - PAD_R;
    const innerH = CHART_H - PAD_T - PAD_B;
    let lo = stats.min, hi = stats.max;
    if (hi - lo < 0.5) { lo -= 2; hi += 2; }
    const pad = (hi - lo) * 0.14;
    lo -= pad; hi += pad;
    const x = (i: number) => PAD_L + (pts.length === 1 ? innerW / 2 : (i / (pts.length - 1)) * innerW);
    const y = (kg: number) => PAD_T + innerH - ((kg - lo) / (hi - lo)) * innerH;
    const segs: { left: number; top: number; len: number; deg: number }[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const x1 = x(i), y1 = y(pts[i].kg), x2 = x(i + 1), y2 = y(pts[i + 1].kg);
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      segs.push({ left: (x1 + x2) / 2 - len / 2, top: (y1 + y2) / 2 - 1.25, len, deg: (Math.atan2(dy, dx) * 180) / Math.PI });
    }
    const dots = pts.map((p, i) => ({ x: x(i), y: y(p.kg), kg: p.kg, date: p.date, time: p.time }));
    const grid = [0, 1, 2, 3].map((k) => {
      const kg = hi - ((hi - lo) * k) / 3;
      return { y: y(kg), label: kg.toFixed(1) };
    });
    const minIdx = pts.findIndex((p) => p.kg === stats.min);
    const maxIdx = pts.findIndex((p) => p.kg === stats.max);
    const inRange = targetConverted !== null && targetConverted >= lo && targetConverted <= hi;
    const targetY = inRange && targetConverted !== null ? y(targetConverted) : null;
    return { segs, dots, grid, minIdx, maxIdx, lastIdx: pts.length - 1, lo, hi, targetY };
  }, [pts, stats, width, targetConverted]);

  if (!stats || pts.length === 0) return null;

  const toTarget = targetConverted !== null ? stats.last - targetConverted : null;
  const focused = activeIdx !== null && layout?.dots[activeIdx] ? layout.dots[activeIdx] : null;
  const uText = unitLabel(unit);

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <View style={styles.headLeft}>
          <View style={styles.titleBar} />
          <View>
            <Text style={styles.headTitle}>{t.trend}</Text>
            <Text style={styles.headSub}>
              {focused
                ? focused.time.slice(5, 16) + ' · ' + focused.kg.toFixed(2) + ' ' + uText
                : unitLabelText + ' · ' + pts.length + ' ' + t.days}
            </Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.75} onPress={onEditTarget} style={styles.targetBtn}>
          <Text style={styles.targetBtnText}>
            {targetKg !== null ? t.goalLabel + ' ' + (targetConverted !== null ? targetConverted.toFixed(1) : targetKg) + ' ' + uText : t.setGoal}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chartBox} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {layout && (
          <>
            {layout.grid.map((g, i) => (
              <View key={i}>
                <View style={[styles.gridLine, { top: g.y }]} />
                <Text style={[styles.yLabel, T.num, { top: g.y - 7 }]}>{g.label}</Text>
              </View>
            ))}

            {layout.targetY !== null && (
              <>
                <View style={[styles.targetLine, { top: layout.targetY }]} />
                <View style={[styles.targetTag, { top: layout.targetY - 10 }]}>
                  <Text style={styles.targetLabel}>
                    {t.goalLabel} {targetConverted !== null ? targetConverted.toFixed(1) : targetKg}
                  </Text>
                </View>
              </>
            )}

            {layout.segs.map((s, i) => (
              <View
                key={i}
                style={[
                  styles.seg,
                  { left: s.left, top: s.top, width: s.len },
                  { transform: [{ rotate: s.deg + 'deg' }] },
                ]}
              />
            ))}

            {layout.dots.map((d, i) => {
              const isEnd = i === layout.lastIdx;
              const isActive = i === activeIdx;
              const isExtreme = i === layout.minIdx || i === layout.maxIdx;
              const r = isActive ? 7 : isEnd ? 5 : 3.5;
              return (
                <TouchableOpacity
                  key={i + '_' + d.time}
                  activeOpacity={0.9}
                  onPress={() => setActiveIdx(isActive ? null : i)}
                  hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                  style={[styles.dotTouch, { left: d.x - 10, top: d.y - 10 }]}>
                  {isActive && <View style={styles.dotHalo} />}
                  <View
                    style={[
                      styles.dot,
                      { width: r * 2, height: r * 2, borderRadius: r },
                      isEnd && styles.dotEnd,
                      isExtreme && !isEnd && styles.dotExtreme,
                      isActive && styles.dotActive,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}

            {layout.dots.map((d, i) => {
              const show = focused ? i === activeIdx : (i === layout.lastIdx || i === layout.minIdx || i === layout.maxIdx);
              if (!show) return null;
              const isLast = i === layout.lastIdx;
              return (
                <Text
                  key={'l_' + i + '_' + d.time}
                  style={[
                    styles.valueLabel,
                    T.num,
                    { left: Math.min(Math.max(d.x - 24, PAD_L), (width || 240) - 52), top: Math.max(2, d.y - 22) },
                    (isLast || i === activeIdx) && styles.valueLabelLast,
                  ]}>
                  {d.kg.toFixed(2)}
                </Text>
              );
            })}

            {layout.dots.length > 0 && (
              <>
                <Text style={[styles.xLabel, { left: PAD_L, bottom: 4 }]}>{fmtDate(layout.dots[0].date)}</Text>
                <Text style={[styles.xLabel, { right: PAD_R, bottom: 4 }]}>{fmtDate(layout.dots[layout.dots.length - 1].date)}</Text>
              </>
            )}
          </>
        )}
      </View>

      <View style={styles.statRow}>
        <MiniStat label={t.start} value={stats.first.toFixed(2)} unit={uText} />
        <MiniStat label={t.latest} value={stats.last.toFixed(2)} unit={uText} color={C.primary} />
        <MiniStat
          label={t.change}
          value={(stats.delta > 0 ? '+' : '') + stats.delta.toFixed(2)}
          unit={uText}
          color={stats.delta > 0.05 ? C.warn : stats.delta < -0.05 ? C.accent : C.textSub}
        />
        <MiniStat
          label={toTarget === null ? t.goalUnset : (toTarget <= 0 ? t.goalReached : t.toGoal)}
          value={toTarget === null ? '—' : Math.abs(toTarget).toFixed(2)}
          unit={toTarget === null ? '' : uText}
          color={toTarget === null ? C.textHint : toTarget <= 0 ? C.accent : C.textSub}
        />
      </View>
    </View>
  );
}

function MiniStat({ label, value, unit, color = C.text }: { label: string; value: string; unit: string; color?: string }) {
  return (
    <View style={styles.mini}>
      <Text style={[styles.miniVal, T.num, { color }]}>
        {value}{unit ? <Text style={styles.miniUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.miniLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function fmtDate(d: string) {
  const p = d.split('-');
  return p.length === 3 ? p[1] + '-' + p[2] : d;
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border, ...SH.card,
  },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleBar: { width: 3, height: 18, borderRadius: 2, backgroundColor: C.primary },
  headTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  headSub: { fontSize: 11, color: C.textHint, marginTop: 1 },
  targetBtn: {
    backgroundColor: C.accentSoft, borderWidth: 1, borderColor: 'rgba(0,217,163,0.32)',
    borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5,
  },
  targetBtnText: { fontSize: 11, color: C.accent, fontWeight: '700' },
  chartBox: { width: '100%', height: CHART_H, position: 'relative' },
  gridLine: { position: 'absolute', left: PAD_L, right: PAD_R, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  yLabel: { position: 'absolute', left: 2, width: PAD_L - 8, fontSize: 10, color: C.textHint, textAlign: 'right' },
  targetLine: {
    position: 'absolute', left: PAD_L, right: PAD_R, height: 1.5,
    backgroundColor: 'rgba(0,217,163,0.38)', borderRadius: 1,
  },
  targetTag: {
    position: 'absolute', right: PAD_R, backgroundColor: '#122625',
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,217,163,0.35)',
  },
  targetLabel: { fontSize: 9, color: C.accent, fontWeight: '700' },
  seg: { position: 'absolute', height: 2.5, backgroundColor: C.primary, borderRadius: 2 },
  dotTouch: { position: 'absolute', width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  dotHalo: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(77,141,255,0.28)',
  },
  dot: { backgroundColor: '#6BA2FF', borderWidth: 1.5, borderColor: C.surface },
  dotEnd: { backgroundColor: C.primary, borderColor: '#fff' },
  dotExtreme: { backgroundColor: C.accent },
  dotActive: { backgroundColor: '#fff', borderColor: C.primary, borderWidth: 2 },
  valueLabel: { position: 'absolute', fontSize: 10, color: C.textSub, fontWeight: '600' },
  valueLabelLast: { color: C.primary, fontSize: 11, fontWeight: '800' },
  xLabel: { position: 'absolute', fontSize: 10, color: C.textHint },
  statRow: {
    flexDirection: 'row', marginTop: 10, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  mini: { flex: 1, alignItems: 'center' },
  miniVal: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  miniUnit: { fontSize: 10, fontWeight: '600', color: C.textHint },
  miniLabel: { fontSize: 10, color: C.textHint, marginTop: 2 },
});
