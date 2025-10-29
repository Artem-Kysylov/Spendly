import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
import { DEFAULT_LOCALE, isSupportedLanguage, loadMessages } from './i18n/config';

export default getRequestConfig(async ({locale}) => {
  const currentLocale = isSupportedLanguage(locale ?? '') ? (locale as any) : DEFAULT_LOCALE;
  return {
    locale: currentLocale,
    messages: await loadMessages(currentLocale)
  };
});
