'use client';

import { Bus, Car, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { getAffiliatesByType } from '@/lib/affiliates';

export function TransportAffiliates() {
    const busAffiliate = getAffiliatesByType('bus')[0];
    const rentalAffiliate = getAffiliatesByType('rental')[1] || getAffiliatesByType('rental')[0]; // Prefer Rakuten Rental if available

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {/* バス予約 */}
            {busAffiliate && (
                <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href={busAffiliate.webUrl}
                    target="_blank"
                    rel="nofollow sponsored noopener"
                    className="relative overflow-hidden group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200 shadow-sm hover:shadow-md transition-all active:ring-2 active:ring-red-400"
                >
                    <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Bus className="w-12 h-12 text-red-900" />
                    </div>
                    <div className="bg-red-600 p-2 rounded-lg mb-3 shadow-sm group-hover:bg-red-700 transition-colors">
                        <Bus className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-black text-red-900 text-lg mb-1 leading-none">高速バスを予約</span>
                    <span className="text-[10px] text-red-700 font-bold mb-3">{busAffiliate.description}</span>
                    <div className="bg-white px-4 py-1.5 rounded-full text-[10px] font-black text-red-600 border border-red-200 flex items-center gap-1">
                        {busAffiliate.name}で空席確認
                        <ExternalLink className="w-3 h-3" />
                    </div>
                </motion.a>
            )}

            {/* レンタカー予約 */}
            {rentalAffiliate && (
                <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href={rentalAffiliate.webUrl}
                    target="_blank"
                    rel="nofollow sponsored noopener"
                    className="relative overflow-hidden group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 shadow-sm hover:shadow-md transition-all active:ring-2 active:ring-blue-400"
                >
                    <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Car className="w-12 h-12 text-blue-900" />
                    </div>
                    <div className="bg-blue-600 p-2 rounded-lg mb-3 shadow-sm group-hover:bg-blue-700 transition-colors">
                        <Car className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-black text-blue-900 text-lg mb-1 leading-none">レンタカーを予約</span>
                    <span className="text-[10px] text-blue-700 font-bold mb-3">{rentalAffiliate.description}</span>
                    <div className="bg-white px-4 py-1.5 rounded-full text-[10px] font-black text-blue-600 border border-blue-200 flex items-center gap-1">
                        {rentalAffiliate.name}で料金確認
                        <ExternalLink className="w-3 h-3" />
                    </div>
                </motion.a>
            )}
        </div>
    );
}
