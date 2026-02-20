'use client';

import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { FeedbackForm } from './feedback-form';

export function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50">
            {isOpen ? (
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-[calc(100vw-3rem)] sm:w-[400px] animate-in slide-in-from-bottom-4 duration-300">
                    <FeedbackForm onClose={() => setIsOpen(false)} />
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 hover:scale-110 active:scale-95 transition-all duration-200 group flex items-center gap-2"
                >
                    <MessageSquarePlus className="w-6 h-6" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-sm font-bold">
                        フィードバック
                    </span>
                </button>
            )}
        </div>
    );
}
