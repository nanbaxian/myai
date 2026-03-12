import type { Metadata } from 'next'
import { I18nProvider } from '@/lib/i18n/context'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { getSiteUrl, isLocale, locales, type Locale } from '@/lib/i18n/config'

export function generateStaticParams() {
  return locales.map(locale => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en'
  const dict = getDictionary(locale)
  const siteUrl = getSiteUrl()

  return {
    title: dict.metadata.title,
    description: dict.metadata.description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: `${siteUrl}/en`,
        zh: `${siteUrl}/zh`,
        'x-default': `${siteUrl}/en`,
      },
    },
    openGraph: {
      title: dict.metadata.title,
      description: dict.metadata.description,
      url: `${siteUrl}/${locale}`,
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      siteName: 'Xinyu',
      type: 'website',
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en'

  return <I18nProvider locale={locale}>{children}</I18nProvider>
}
