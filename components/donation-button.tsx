'use client';

import { Heart } from 'lucide-react';

export function DonationButton() {
    // Stripe Payment Link URL (Replace with actual link later)
    // Example: https://buy.stripe.com/test_...
    const paymentLink = '#';

    const handleClick = (e: React.MouseEvent) => {
        if (paymentLink === '#') {
            e.preventDefault();
            alert('【開発環境デモ】ここにStripeの支払いリンクを設定します。\n(まだリンク先がないためアラートを表示しています)');
        }
    };

    return (
        <div className="mt-8 flex justify-center">
            <a
                href={paymentLink}
                onClick={handleClick}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
                <Heart className="w-5 h-5 fill-white/20 group-hover:fill-white/40 animate-pulse" />
                <span className="font-bold text-sm">開発者にコーヒーを奢る (¥500)</span>
            </a>
        </div>
    );
}
