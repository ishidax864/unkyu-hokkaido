import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Inter } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unkyu-ai.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "運休北海道 - JR北海道の運休予測サービス",
    template: "%s | 運休北海道",
  },
  description: "明日の電車、動く？AIが天候や運行状況からJR北海道の運休リスクをリアルタイムで予測。北海道の通勤・通学を支える運行予報士。",
  keywords: ["運休", "北海道", "JR北海道", "電車", "遅延", "予測", "AI", "天気", "通勤", "札幌", "新千歳空港", "吹雪", "雪"],
  authors: [{ name: "運休北海道" }],
  creator: "運休北海道",
  publisher: "運休北海道",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "運休北海道 - JR北海道の運休予測サービス",
    description: "明日の電車、動く？AIが天候や運行状況からJR北海道の運休リスクをリアルタイムで予測。",
    url: siteUrl,
    siteName: "運休北海道",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "運休北海道 - JR北海道の運休予測サービス",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "運休北海道 - JR北海道の運休予測サービス",
    description: "明日の電車、動く？AIがJR北海道の運休リスクをリアルタイムで予測。",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "運休北海道",
  },
  verification: {
    // Google Search Console 認証（本番公開時に追加）
    // google: "your-google-verification-code",
  },
  alternates: {
    canonical: siteUrl,
  },
  other: {
    'apple-mobile-web-app-status-bar-style': 'default',
  },
  category: 'transportation',
};

// 🆕 JSON-LD 構造化データ（複数スキーマ）
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "運休北海道",
    "url": siteUrl,
    "operatingSystem": "All",
    "applicationCategory": "UtilitiesApplication",
    "description": "JR北海道13路線の運休リスクをAIで予測。天気・運行情報・路線特性を統合分析し、代替交通手段も提案。",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "JPY"
    },
    "featureList": "AI運休予測, リアルタイム運行情報, 代替交通提案, お気に入りルート, 13路線対応",
    "inLanguage": "ja",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "株式会社アンドアール",
    "url": siteUrl,
    "logo": `${siteUrl}/og-image.png`,
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "info@andr.ltd",
      "contactType": "customer service",
      "availableLanguage": "Japanese"
    },
    "sameAs": []
  }
];

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#007849" },
    { media: "(prefers-color-scheme: dark)", color: "#007849" },
  ],
  colorScheme: "light",
};

import { GoogleAnalytics } from '@next/third-parties/google'; // 🆕
import { SiteFooter } from '@/components/site-footer';
import { FeedbackButton } from '@/components/feedback-button'; // 🆕
import { CookieConsent } from '@/components/cookie-consent';
import { ToastProvider } from '@/components/toast';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID; // 🆕 GA4測定ID

  return (
    <html lang="ja">
      {/* ... (head) ... */}
      <body className={`${notoSansJP.variable} ${inter.variable} font-sans antialiased`}>
        {/* 🆕 構造化データを挿入 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ToastProvider>
          <div className="flex flex-col min-h-screen">
            <div className="flex-grow">
              {children}
            </div>
            <SiteFooter />
          </div>
          <FeedbackButton />
          <CookieConsent />
        </ToastProvider>
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
