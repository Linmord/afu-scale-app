import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DICTS, type Strings } from './dict';
import { detectDeviceLang, FALLBACK_LANG, type Lang } from './types';

const LANG_KEY = 'afu_lang';

interface I18nCtx {
  lang: Lang;
  t: Strings;
  /** 'system' 表示跟随系统；否则为手动选择 */
  pref: Lang | 'system';
  setLang: (l: Lang | 'system') => void;
  systemLang: Lang;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [systemLang] = useState<Lang>(() => detectDeviceLang());
  const [pref, setPref] = useState<Lang | 'system'>('system');
  const [ready, setReady] = useState(false);

  // 读取上次选择
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANG_KEY);
        if (saved === 'system') setPref('system');
        else if (saved && saved in DICTS) setPref(saved as Lang);
      } catch {}
      setReady(true);
    })();
  }, []);

  const setLang = useCallback((l: Lang | 'system') => {
    setPref(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
  }, []);

  const lang: Lang = pref === 'system' ? systemLang : pref;

  const value = useMemo<I18nCtx>(() => ({
    lang,
    t: DICTS[lang] ?? DICTS[FALLBACK_LANG],
    pref,
    setLang,
    systemLang,
  }), [lang, pref, setLang, systemLang]);

  // 首次渲染前避免闪烁：未就绪也直接渲染（用默认语言即可）
  void ready;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n must be used within I18nProvider');
  return v;
}

export type { Lang } from './types';
export { LANGS } from './types';
