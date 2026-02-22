import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: '使い方ガイド - 運休北海道の使い方を4ステップで解説',
    description: '運休北海道の使い方を4ステップで分かりやすく解説。駅の入力方法、AI予測結果の見方、代替交通手段の確認、お気に入りルートの登録まで、初めての方でもすぐに使いこなせます。',
    alternates: {
        canonical: '/onboarding',
    },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
    return children;
}
