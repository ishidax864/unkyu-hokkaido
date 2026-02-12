'use client';

import { Bus, Car, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export function TransportAffiliates() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {/* 楽天バス予約 */}
            <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href="https://hb.afl.rakuten.co.jp/hsc/50ead9ce.151a5ac5.50e9f038.48437186/?link_type=pict&ut=eyJwYWdlIjoic2hvcCIsInR5cGUiOiJwaWN0IiwiY29sIjoxLCJjYXQiOiIxMTgiLCJiYW4iOjMzMTQwNTIsImFtcCI6dHJ1ZX0%3D"
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
                <span className="text-[10px] text-red-700 font-bold mb-3">JR運休時の強力な代替手段</span>
                <div className="bg-white px-4 py-1.5 rounded-full text-[10px] font-black text-red-600 border border-red-200 flex items-center gap-1">
                    楽天トラベルで空席確認
                    <ExternalLink className="w-3 h-3" />
                </div>
                {/* User provided banner image would go here if needed, but a clean UI is often better. 
                    However, I'll include the img tag as requested, styled to fit. */}
                <img
                    src="https://hbb.afl.rakuten.co.jp/hsb/50ead9ce.151a5ac5.50e9f038.48437186/?me_id=2100001&me_adv_id=3314052&t=pict"
                    alt="Rakuten Bus"
                    className="mt-4 h-12 w-auto opacity-80 group-hover:opacity-100 transition-opacity"
                />
            </motion.a>

            {/* 楽天レンタカー */}
            <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href="https://hb.afl.rakuten.co.jp/hsc/50ead955.debb157c.50e9f038.48437186/?link_type=pict&ut=eyJwYWdlIjoic2hvcCIsInR5cGUiOiJwaWN0IiwiY29sIjoxLCJjYXQiOjEsImJhbiI6Mjc2MjUyNCwiYW1wIjp0cnVlfQ%3D%3D"
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
                <span className="text-[10px] text-blue-700 font-bold mb-3">自由な移動で吹雪を回避</span>
                <div className="bg-white px-4 py-1.5 rounded-full text-[10px] font-black text-blue-600 border border-blue-200 flex items-center gap-1">
                    楽天トラベルで料金確認
                    <ExternalLink className="w-3 h-3" />
                </div>
                <img
                    src="https://hbb.afl.rakuten.co.jp/hsb/50ead955.debb157c.50e9f038.48437186/?me_id=2100017&me_adv_id=2762524&t=pict"
                    alt="Rakuten Car Rental"
                    className="mt-4 h-12 w-auto opacity-80 group-hover:opacity-100 transition-opacity"
                />
            </motion.a>
        </div>
    );
}
