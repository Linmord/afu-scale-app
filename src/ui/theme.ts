/**
 * 设计系统 v3：极简深色健康风 · 克制层级 · 细边通透 · 等宽数字
 */
export const C = {
  // 背景层次（深空灰黑，拉开主次对比）
  bg: '#0B0D12',
  surface: '#141720',
  surfaceAlt: '#1B1F2B',
  elevated: '#222736',

  // 文字
  text: '#F3F5F9',
  textSub: '#9EA7B8',
  textHint: '#636C7E',

  // 品牌色
  primary: '#4D8DFF',
  primaryDeep: '#2C64D8',
  primarySoft: 'rgba(77, 141, 255, 0.14)',
  accent: '#00D9A3',
  accentSoft: 'rgba(0, 217, 163, 0.14)',
  warn: '#FFB020',
  warnSoft: 'rgba(255, 176, 32, 0.14)',
  danger: '#FF5C5C',
  dangerSoft: 'rgba(255, 92, 92, 0.14)',

  // 细边框与遮罩
  border: 'rgba(255, 255, 255, 0.06)',
  borderStrong: 'rgba(255, 255, 255, 0.12)',
  highlight: 'rgba(255, 255, 255, 0.09)',
  overlay: 'rgba(5, 7, 12, 0.72)',
};

export const G = {
  primary: ['#4D8DFF', '#6F5BFF'] as const,
  accent: ['#00D9A3', '#00B8D4'] as const,
  warm: ['#FF9F43', '#FF5C5C'] as const,
  dark: ['#1D222E', '#141720'] as const,
  hero: ['#1C2747', '#141826', '#0E1118'] as const,
};

export const R = { xs: 8, sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

export const SH = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  glow: {
    shadowColor: '#4D8DFF',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
};

export const T = {
  hero: { fontSize: 32, fontWeight: '800' as const, color: C.text, letterSpacing: -0.6 },
  h1: { fontSize: 20, fontWeight: '700' as const, color: C.text, letterSpacing: -0.2 },
  h2: { fontSize: 16, fontWeight: '600' as const, color: C.text },
  body: { fontSize: 14, color: C.text },
  label: { fontSize: 12, fontWeight: '600' as const, color: C.textSub, letterSpacing: 0.3 },
  meta: { fontSize: 12, color: C.textHint },
  mono: { fontSize: 12, color: C.textSub, fontFamily: 'monospace' as const },
  num: { fontVariant: ['tabular-nums' as const] },
};

export const S = {
  screen: { flex: 1, backgroundColor: C.bg },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    ...SH.card,
  },
  cardFlat: {
    backgroundColor: C.surfaceAlt,
    borderRadius: R.md,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  label: T.label,
  hint: { ...T.meta, marginTop: 4, lineHeight: 17 },
  big: { fontSize: 44, fontWeight: '800' as const, color: C.text, letterSpacing: -1, fontVariant: ['tabular-nums' as const] },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const },
  rowBetween: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 10 },
};
