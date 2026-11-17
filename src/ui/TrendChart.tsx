import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C, R, T, S } from './theme';
import type { MeasurementRecord } from '../storage/records';

/**
 * 体重趋势图：纯 View 绘制折线（不依赖图表库）。
 * - 按日期聚合（每天取最后一次测量）
 * - 自动缩放 Y 轴、网格线、数据点、最高/最低标注
 * - 显示区间变化与距目标差值
 */

const CHART_H = 190;
const PAD_L = 42;
const PAD_R = 14;
const PAD_T = 16;
const PAD_B = 26;
const TARGET_KG = 60;

interface Point { date: string; kg: number }

function aggregate(records: MeasurementRecord[]): Point[] {
  const byDate = new Map<string, MeasurementRecord>();
  for (const r of records) {
    const d = r.time.slice(0, 10);
    const prev = byDate.get(d);
    // 同一天取更晚的那条
    if (!prev || r.time > prev.time) byDate.set(d, r);
  }
  return Array.from(byDate.entries())
    .map(([date, r]) => ({ date, kg: r.weight_kg }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-30);   // 最多显示 30 天
}

export function TrendChart({ records, unitLabel }: { records: MeasurementRecord[]; unitLabel: string }) {
  const [width, setWidth] = useState(0);

  const pts = useMemo(() => aggregate(records), [records]);

  const stats = useMemo(() => {
    if (pts.length === 0) return null;
    const kgs = pts.map((p) => p.kg);
    const first = kgs[0];
    const last = kgs[kgs.length - 1];
    const min = Math.min(...kgs);
    const max = Math.max(...kgs);
    return { first, last, min, max, delta: last - first, avg: kgs.reduce((a, b) => a + b, 0) / kgs.length };
  }, [pts]);

  const layout = useMemo(() => {
    if (!stats || width <= PAD_L + PAD_R + 20) return null;
    const innerW = width - PAD_L - PAD_R;
    const innerH = CHART_H - PAD_T - PAD_B;
    // Y 轴范围带 12% 余量；单点或全等值时给 ±2kg
    let lo = stats.min, hi = stats.max;
    if (hi - lo < 0.5) { lo -= 2; hi += 2; }
    const pad = (hi - lo) * 0.12;
    lo -= pad; hi += pad;
    const x = (i: number) => PAD_L + (pts.length === 1 ? innerW / 2 : (i / (pts.length - 1)) * innerW);
    const y = (kg: number) => PAD_T + innerH - ((kg - lo) / (hi - lo)) * innerH;
    const segs: { left: number; top: number; len: number; deg: number }[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const x1 = x(i), y1 = y(pts[i].kg), x2 = x(i + 1), y2 = y(pts[i + 1].kg);
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      segs.push({ left: (x1 + x2) / 2 - len / 2, top: (y1 + y2) / 2 - 1.5, len, deg: (Math.atan2(dy, dx) * 180) / Math.PI });
    }
    const dots = pts.map((p, i) => ({ x: x(i), y: y(p.kg), kg: p.kg, date: p.date }));
    // 网格线 4 条
    const grid = [0, 1, 2, 3].map((k) => {
      const kg = hi - ((hi - lo) * k) / 3;
      return { y: y(kg), label: kg.toFixed(1) };
    });
    const minIdx = pts.findIndex((p) => p.kg === stats.min);
    const maxIdx = pts.findIndex((p) => p.kg === stats.max);
    const inRange = TARGET_KG >= lo && TARGET_KG <= hi;
    const targetY = inRange ? y(TARGET_KG) : null;
    return { segs, dots, grid, minIdx, maxIdx, lastIdx: pts.length - 1, lo, hi, targetY };
  }, [pts, stats, width]);

  if (!stats || pts.length === 0) return null;

  const toTarget = stats.last - TARGET_KG;

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={styles.headTitle}>体重趋势</Text>
        <Text style={styles.headSub}>{unitLabel} · 近 {pts.length} 天</Text>
      </View>

      <View style={styles.chartBox} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {layout && (
          <>
            {/* 网格与 Y 轴刻度 */}
            {layout.grid.map((g, i) => (
              <View key={i}>
                <View style={[styles.gridLine, { top: g.y }]} />
                <Text style={[styles.yLabel, { top: g.y - 8 }]}>{g.label}</Text>
              </View>
            ))}

            {/* 目标线 60kg */}
            {layout.targetY !== null && (
              <>
                <View style={[styles.targetLine, { top: layout.targetY }]} />
                <Text style={[styles.targetLabel, { top: layout.targetY - 14 }]}>目标 {TARGET_KG}</Text>
              </>
            )}

            {/* 折线段 */}
            {layout.segs.map((s, i) => (
              <View
                key={i}
                style={[
                  styles.seg,
                  { left: s.left, top: s.top, width: s.len },
                  { transform: [{ rotate: `${s.deg}deg` }] },
                ]}
              />
            ))}

            {/* 数据点 */}
            {layout.dots.map((d, i) => {
              const isEnd = i === layout.lastIdx;
              const isExtreme = i === layout.minIdx || i === layout.maxIdx;
              return (
                <View
                  key={d.date}
                  style={[
                    styles.dot,
                    { left: d.x - (isEnd ? 5 : 3.5), top: d.y - (isEnd ? 5 : 3.5) },
                    isEnd && styles.dotEnd,
                    isExtreme && !isEnd && styles.dotExtreme,
                  ]}
                />
              );
            })}

            {/* 极值与最新标注 */}
            {layout.dots.map((d, i) => {
              if (i !== layout.lastIdx && i !== layout.minIdx && i !== layout.maxIdx) return null;
              const isLast = i === layout.lastIdx;
              return (
                <Text
                  key={'l' + d.date}
                  style={[
                    styles.valueLabel,
                    { left: Math.min(Math.max(d.x - 22, 2), (width || 200) - 50), top: d.y - 22 },
                    isLast && styles.valueLabelLast,
                  ]}
                >
                  {d.kg.toFixed(1)}
                </Text>
              );
            })}

            {/* X 轴首尾日期 */}
            {layout.dots.length > 0 && (
              <>
                <Text style={[styles.xLabel, { left: PAD_L - 6, bottom: 4 }]}>{fmtDate(layout.dots[0].date)}</Text>
                <Text style={[styles.xLabel, { right: PAD_R - 6, bottom: 4 }]}>{fmtDate(layout.dots[layout.dots.length - 1].date)}</Text>
              </>
            )}
          </>
        )}
      </View>

      {/* 统计条 */}
      <View style={styles.statRow}>
        <MiniStat label="起始" value={stats.first.toFixed(1)} unit="kg" />
        <MiniStat label="最新" value={stats.last.toFixed(1)} unit="kg" color={C.primary} />
        <MiniStat
          label="变化"
          value={(stats.delta > 0 ? '+' : '') + stats.delta.toFixed(1)}
          unit="kg"
          color={stats.delta > 0.05 ? C.warn : stats.delta < -0.05 ? C.accent : C.textSub}
        />
        <MiniStat label="距目标" value={toTarget.toFixed(1)} unit="kg" color={toTarget <= 0 ? C.accent : C.textSub} />
      </View>
    </View>
  );
}

function MiniStat({ label, value, unit, color = C.text }: { label: string; value: string; unit: string; color?: string }) {
  return (
    <View style={styles.mini}>
      <Text style={[styles.miniVal, { color }]}>{value}<Text style={styles.miniUnit}> {unit}</Text></Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function fmtDate(d: string) {
  const p = d.split('-');
  return p.length === 3 ? `${p[1]}-${p[2]}` : d;
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: C.surface, borderRadius: R.lg, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  headTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  headSub: { fontSize: 12, color: C.textHint },
  chartBox: { width: '100%', height: CHART_H, position: 'relative' },
  gridLine: { position: 'absolute', left: PAD_L, right: PAD_R, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  yLabel: { position: 'absolute', left: 4, width: PAD_L - 10, fontSize: 10, color: C.textHint, textAlign: 'right' },
  targetLine: {
    position: 'absolute', left: PAD_L, right: PAD_R, height: 2,
    backgroundColor: 'rgba(0,217,163,0.42)', borderRadius: 1,
  },
  targetLabel: { position: 'absolute', right: PAD_R, fontSize: 9, color: C.accent, fontWeight: '700' },
  seg: { position: 'absolute', height: 3, backgroundColor: C.primary, borderRadius: 2 },
  dot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(77,141,255,0.55)' },
  dotEnd: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  dotExtreme: { backgroundColor: C.accent },
  valueLabel: { position: 'absolute', fontSize: 10, color: C.textHint, fontWeight: '600' },
  valueLabelLast: { color: C.primary, fontSize: 12, fontWeight: '800' },
  xLabel: { position: 'absolute', fontSize: 10, color: C.textHint },
  statRow: { flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  mini: { flex: 1, alignItems: 'center' },
  miniVal: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  miniUnit: { fontSize: 10, fontWeight: '600', color: C.textHint },
  miniLabel: { fontSize: 11, color: C.textHint, marginTop: 3 },
});
