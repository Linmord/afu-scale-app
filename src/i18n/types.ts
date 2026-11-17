import * as Localization from 'expo-localization';

export type Lang = 'zh-Hans' | 'zh-Hant' | 'ja' | 'de' | 'en';

export const LANGS: { code: Lang; label: string; native: string; flag: string }[] = [
  { code: 'zh-Hans', label: '简体中文', native: '简体中文', flag: '🇨🇳' },
  { code: 'zh-Hant', label: '繁體中文', native: '繁體中文', flag: '🇹🇼' },
  { code: 'ja', label: '日本語', native: '日本語', flag: '🇯🇵' },
  { code: 'de', label: 'Deutsch', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
];

export const FALLBACK_LANG: Lang = 'ja';

/** 把系统语言标签归一到我们支持的 5 种；不支持则返回日语 */
export function normalizeLang(tag: string | null | undefined): Lang | null {
  if (!tag) return null;
  const t = tag.toLowerCase().replace('_', '-');
  if (t.startsWith('zh')) {
    // 繁体优先判定
    if (/hant|tw|hk|mo/.test(t)) return 'zh-Hant';
    return 'zh-Hans';
  }
  if (t.startsWith('ja')) return 'ja';
  if (t.startsWith('de')) return 'de';
  if (t.startsWith('en')) return 'en';
  return null;
}

/** 读取设备首选语言；不在支持列表则返回日语 */
export function detectDeviceLang(): Lang {
  try {
    const locales = Localization.getLocales();
    for (const l of locales) {
      const n = normalizeLang(l.languageTag) || normalizeLang(l.languageCode);
      if (n) return n;
    }
  } catch {}
  return FALLBACK_LANG;
}
