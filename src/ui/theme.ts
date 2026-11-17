/**
 * 设计系统 v2：现代深色优雅风 · 大圆角 · 柔和阴影 · 渐变点缀
 */
export const C = {
  // 背景层次
  bg: '#0F1115',           // 最深背景
  surface: '#171A21',      // 卡片面
  surfaceAlt: '#1E222B',   // 次级面
  elevated: '#242934',     // 浮起面

  // 文字
  text: '#F2F4F8',
  textSub: '#A8B0BF',
  textHint: '#6B7385',

  // 品牌色
  primary: '#4D8DFF',
  primaryDeep: '#2E6BE6',
  accent: '#00D9A3',        // 薄荷绿（成功/健康）
  warn: '#FFB020',
  danger: '#FF5C5C',

  // 辅助
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.14)',
  overlay: 'rgba(0,0,0,0.65)',
};

export const G = {
  primary: ['#4D8DFF', '#7B5CFF'] as const,
  accent: ['#00D9A3', '#00B8D9'] as const,
  warm: ['#FF9F43', '#FF5C5C'] as const,
  dark: ['#1E222B', '#171A21'] as const,
  hero: ['#2A3A6B', '#1A1F33', '#0F1115'] as const,
};

export const R = { xs: 8, sm: 12, md: 16, lg: 22, xl: 28, pill: 999 };

export const SH = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  glow: {
    shadowColor: '#4D8DFF',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
};

export const T = {
  hero: { fontSize: 34, fontWeight: '800' as const, color: C.text, letterSpacing: -0.5 },
  h1: { fontSize: 22, fontWeight: '700' as const, color: C.text, letterSpacing: -0.2 },
  h2: { fontSize: 17, fontWeight: '600' as const, color: C.text },
  body: { fontSize: 15, color: C.text },
  label: { fontSize: 13, fontWeight: '600' as const, color: C.textSub, letterSpacing: 0.2 },
  meta: { fontSize: 12, color: C.textHint },
  mono: { fontSize: 12, color: C.textSub, fontFamily: 'monospace' as const },
};

export const S = {
  screen: { flex: 1, backgroundColor: C.bg },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    ...SH.card,
  },
  cardFlat: {
    backgroundColor: C.surfaceAlt,
    borderRadius: R.md,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  label: T.label,
  hint: { ...T.meta, marginTop: 6, lineHeight: 17 },
  big: { fontSize: 46, fontWeight: '800' as const, color: C.text, letterSpacing: -1 },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const },
  rowBetween: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
};
