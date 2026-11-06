import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { type Lang, type TranslationKey, t } from "./translations";

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "fr",
  setLang: () => {},
  t: (key) => key,
  isRTL: false,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("lang") as Lang) ?? "fr";
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("lang", newLang);
  };

  const isRTL = lang === "ar";

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, isRTL]);

  const translate = (key: TranslationKey) => t(key, lang);

  return (
    <I18nContext.Provider value={{ lang, setLang, t: translate, isRTL }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);

  // Helper to format currency consistently (e.g. 15 000 د.ج or 15 000 DZD)
  const formatCurrency = (amount: number | string | null | undefined): string => {
    const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
    const formattedNum = isNaN(num) ? "0" : num.toLocaleString("fr-DZ");
    if (ctx.lang === "ar") {
      return `${formattedNum} د.ج`;
    }
    return `${formattedNum} DZD`;
  };

  return {
    ...ctx,
    formatCurrency,
  };
}

export type { Lang, TranslationKey };
