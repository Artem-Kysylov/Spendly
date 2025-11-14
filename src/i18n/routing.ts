import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { SUPPORTED_LANGUAGES, DEFAULT_LOCALE } from '@/i18n/config';

export const routing = defineRouting({
  locales: SUPPORTED_LANGUAGES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
  pathnames: {
    '/': '/',
    '/auth': '/auth',
    '/forgot-password': '/forgot-password',
    '/reset-password': '/reset-password',
    '/payment': '/payment',
    '/dashboard': '/dashboard',
    '/onboarding': '/onboarding',
    '/transactions': '/transactions',
    '/budgets': '/budgets',
    '/add-new-budget': '/add-new-budget',
    '/budgets/[id]': '/budgets/[id]',
    '/setup/budget': '/setup/budget',
    '/user-settings': '/user-settings',
  }
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);

export type AppPathnames = keyof typeof routing['pathnames'];
