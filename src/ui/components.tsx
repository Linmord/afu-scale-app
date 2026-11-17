import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, G, R, SH, T, S } from './theme';

/** 主按钮（渐变） */
export function PrimaryButton({
  title, onPress, disabled, loading, colors = G.primary, style,
}: {
  title: string; onPress: () => void; disabled?: boolean; loading?: boolean;
  colors?: readonly [string, string] | readonly string[]; style?: ViewStyle;
}) {
  const off = disabled || loading;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={off} style={[{ borderRadius: R.md, overflow: 'hidden' }, off && { opacity: 0.45 }, style]}>
      <LinearGradient colors={colors as never} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnInner}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{title}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

/** 次级按钮（描边） */
export function GhostButton({ title, onPress, danger, style }: {
  title: string; onPress: () => void; danger?: boolean; style?: ViewStyle;
}) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}
      style={[styles.ghost, danger && { borderColor: 'rgba(255,92,92,0.5)' }, style]}>
      <Text style={[styles.ghostText, danger && { color: C.danger }]}>{title}</Text>
    </TouchableOpacity>
  );
}

/** 卡片容器 */
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[S.card, style]}>{children}</View>;
}

/** 区块标题行 */
export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={[S.rowBetween, { marginBottom: 12 }]}>
      <Text style={T.h2}>{title}</Text>
      {right}
    </View>
  );
}

/** 统计小卡 */
export function StatPill({ label, value, unit, color = C.accent }: {
  label: string; value: string; unit?: string; color?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}<Text style={styles.statUnit}>{unit ? ' ' + unit : ''}</Text></Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** 空状态 */
export function EmptyState({ icon, title, desc }: { icon: string; title: string; desc?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {desc ? <Text style={styles.emptyDesc}>{desc}</Text> : null}
    </View>
  );
}

/** 徽章 */
export function Badge({ text, color = C.accent }: { text: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

/** 底部弹层（Modal 实现：真正屏幕级，不受父级 ScrollView 影响） */
export function Sheet({ visible, onClose, title, children }: {
  visible: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.sheetBg}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheetCard, { paddingBottom: Math.max(insets.bottom, 20) + 14 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  btnInner: { paddingVertical: 15, alignItems: 'center', justifyContent: 'center', borderRadius: R.md },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  ghost: { borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md, paddingVertical: 13, alignItems: 'center' },
  ghostText: { color: C.textSub, fontSize: 15, fontWeight: '600' },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  statUnit: { fontSize: 12, fontWeight: '600' },
  statLabel: { fontSize: 11, color: C.textHint, marginTop: 3 },
  empty: { alignItems: 'center', paddingVertical: 34 },
  emptyIcon: { fontSize: 44, marginBottom: 12, opacity: 0.5 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.textSub },
  emptyDesc: { fontSize: 13, color: C.textHint, marginTop: 6, textAlign: 'center', paddingHorizontal: 20, lineHeight: 19 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: R.pill, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  sheetBg: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  sheetCard: {
    backgroundColor: C.surface, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
    padding: 22, paddingBottom: 34, borderTopWidth: 1, borderColor: C.borderStrong,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 19, fontWeight: '700', color: C.text, marginBottom: 14 },
});
