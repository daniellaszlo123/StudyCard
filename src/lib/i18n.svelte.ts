import en from './locales/en.json';
import hu from './locales/hu.json';

const translations: Record<string, Record<string, string>> = { en, hu };

// Try to load initial locale from localStorage
const storedLocale = typeof localStorage !== 'undefined' ? localStorage.getItem('studycard_locale') : null;
let currentLocale = $state<'en' | 'hu'>(storedLocale === 'hu' ? 'hu' : 'en');

export const i18n = {
  get locale() {
    return currentLocale;
  },
  set locale(value: 'en' | 'hu') {
    currentLocale = value;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('studycard_locale', value);
    }
  },
  t(key: keyof typeof en, params?: Record<string, string>): string {
    const dict = translations[currentLocale] || en;
    let text = dict[key] || en[key] || String(key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    return text;
  }
};
