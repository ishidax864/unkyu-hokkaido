import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: '予測精度について - 1,577件で検証済みの94.1%精度',
    description: 'JR北海道の運休予測エンジンの精度を1,577件のテストケースで検証。確率的中率94.1%、ステータス的中率98.6%。カテゴリ別の精度実績、安全側バイアス設計、データソースの詳細を公開。',
    alternates: {
        canonical: '/accuracy',
    },
};

export default function AccuracyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
