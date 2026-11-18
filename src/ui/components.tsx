import React, { useRef } from 'react';
import {
  ActivityIndicator, Animated, Modal, Pressable, StyleSheet,
  Text, TouchableOpacity, View, ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, G, R, SH, T, S } from './theme';
import { IconChevron } from './Icons';

/** 带微缩回弹手感的交互容器 */
export function ScalePress({
  children, onPress, disabled, style, scaleTo = 0.97,
}: {
  children: React.ReactNode; onPress?: () => void; disabled?: boolean;
  style?: ViewStyle | (ViewStyle | false | undefined)[]; scaleTo?: number;
}) {
  const anim = useRef(new Animated.Value(1)).current;
  const pressIn = () => {
    if (disabled) return;
    Animated.spring(anim, { toValue: scaleTo, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };
  const pressOut = () => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 28, bounciness: 4 }).start();
  };
  return (
    <Pressable onPress={onPress} disabled={disabled} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={[style, { transform: [{ scale: anim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** 主按钮（渐变 + 弹性按压） */
export function PrimaryButton({
  title, onPress, disabled, loading, colors = G.primary, style, compact,
}: {
  title: string; onPress: () => void; disabled?: boolean; loading?: boolean;
  colors?: readonly [string, string] | readonly string[]; style?: ViewStyle; compact?: boolean;
}) {
  const off = disabled || loading;
  return (
    <ScalePress onPress={onPress} disabled={off} style={[{ borderRadius: R.md, overflow: 'hidden' }, off && { opacity: 0.42 }, style]}>
      <LinearGradient
        colors={colors as never}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.btnInner, compact && { paddingVertical: 11 }]}>
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.btnText, compact && { fontSize: 14 }]}>{title}</Text>}
      </LinearGradient>
    </ScalePress>
  );
}

/** 次级按钮（细描边 + 弹性按压） */
export function GhostButton({ title, onPress, danger, disabled, style, compact }: {
  title: string; onPress: () => void; danger?: boolean; disabled?: boolean; style?: ViewStyle; compact?: boolean;
}) {
  return (
    <ScalePress
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.ghost,
        compact && { paddingVertical: 10 },
        danger && { borderColor: 'rgba(255,92,92,0.38)', backgroundColor: 'rgba(255,92,92,0.06)' },
        disabled && { opacity: 0.4 },
        style,
      ]}>
      <Text style={[styles.ghostText, compact && { fontSize: 13 }, danger && { color: C.danger }]}>{title}</Text>
    </ScalePress>
  );
}

/** 卡片容器 */
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle | (ViewStyle | false | undefined)[] }) {
  return <View style={[S.card, style]}>{children}</View>;
}

/** 区块标题行（带克制的左侧品牌微竖线） */
export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={[S.rowBetween, { marginBottom: 10 }]}>
      <View style={S.row}>
        <View style={styles.titleAccent} />
        <Text style={T.h2}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

/** 紧凑分段控件（用于 kg/lb/斤、系统/手动等切换） */
export function SegmentedControl<K extends string>({
  options, value, onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <View style={styles.segTrack}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            activeOpacity={0.8}
            onPress={() => onChange(opt.key)}
            style={[styles.segItem, active && styles.segItemActive]}>
            <Text style={[styles.segText, active && styles.segTextActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** 现代分组设置容器 */
export function SettingGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

/** 分组列表行 */
export function SettingRow({
  icon, iconBg, title, subtitle, value, right, onPress, first, danger,
}: {
  icon?: React.ReactNode; iconBg?: string; title: string; subtitle?: string;
  value?: string; right?: React.ReactNode; onPress?: () => void; first?: boolean; danger?: boolean;
}) {
  const inner = (
    <View style={[styles.settingRow, !first && styles.settingRowBorder]}>
      {icon ? (
        <View style={[styles.settingIcon, iconBg ? { backgroundColor: iconBg } : null]}>
          {icon}
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingTitle, danger && { color: C.danger }]}>{title}</Text>
        {subtitle ? <Text style={styles.settingSub} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.settingVal} numberOfLines={1}>{value}</Text> : null}
      {right}
      {onPress && !right ? <IconChevron size={13} color={C.textHint} dir="right" /> : null}
    </View>
  );
  if (!onPress) return inner;
  return (
    <TouchableOpacity activeOpacity={0.68} onPress={onPress}>
      {inner}
    </TouchableOpacity>
  );
}

/** 统计小卡 */
export function StatPill({ label, value, unit, color = C.accent }: {
  label: string; value: string; unit?: string; color?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, T.num, { color }]}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** 空状态 */
export function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc?: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        {typeof icon === 'string' ? <Text style={styles.emptyIcon}>{icon}</Text> : icon}
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {desc ? <Text style={styles.emptyDesc}>{desc}</Text> : null}
    </View>
  );
}

/** 徽章 */
export function Badge({ text, color = C.accent }: { text: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '1D', borderColor: color + '44' }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

/** 底部弹层（Modal 实现：真正屏幕级，安全区自适应） */
export function Sheet({ visible, onClose, title, children }: {
  visible: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.sheetBg}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheetCard, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  btnInner: { paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: R.md },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  ghost: {
    borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md,
    paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  ghostText: { color: C.textSub, fontSize: 14, fontWeight: '600' },
  titleAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: C.primary, marginRight: 8 },
  segTrack: {
    flexDirection: 'row', backgroundColor: C.bg, borderRadius: R.md,
    padding: 3, borderWidth: 1, borderColor: C.border,
  },
  segItem: {
    flex: 1, paddingVertical: 8, paddingHorizontal: 6, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center',
  },
  segItemActive: {
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.borderStrong, ...SH.soft,
  },
  segText: { fontSize: 12, fontWeight: '600', color: C.textHint },
  segTextActive: { color: C.text, fontWeight: '700' },
  groupTitle: {
    fontSize: 12, fontWeight: '700', color: C.textHint,
    letterSpacing: 0.6, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase',
  },
  groupCard: {
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden', ...SH.card,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 15, gap: 12,
  },
  settingRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  settingIcon: {
    width: 32, height: 32, borderRadius: 9, backgroundColor: C.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  settingTitle: { fontSize: 14, fontWeight: '600', color: C.text },
  settingSub: { fontSize: 12, color: C.textHint, marginTop: 2, lineHeight: 16 },
  settingVal: { fontSize: 13, color: C.textSub, fontWeight: '600', maxWidth: 120, marginRight: 4 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  statUnit: { fontSize: 11, fontWeight: '600' },
  statLabel: { fontSize: 11, color: C.textHint, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 26 },
  emptyIconWrap: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: C.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  emptyIcon: { fontSize: 26, opacity: 0.7 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: C.textSub },
  emptyDesc: { fontSize: 12, color: C.textHint, marginTop: 5, textAlign: 'center', paddingHorizontal: 18, lineHeight: 18 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: R.pill, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  sheetBg: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  sheetCard: {
    backgroundColor: C.surface, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
    padding: 20, maxHeight: '85%', borderTopWidth: 1, borderColor: C.borderStrong,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 12 },
});
