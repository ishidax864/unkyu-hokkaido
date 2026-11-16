'use client';

import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { FeedbackForm } from './feedback-form';

export function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-3 sm:right-6 z-50">
            {isOpen ? (
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-[calc(100vw-2rem)] sm:w-[400px] animate-in slide-in-from-bottom-4 duration-300">
                    <FeedbackForm onClose={() => setIsOpen(false)} />
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    aria-label="ご意見・フィードバック"
                    className="bg-white text-[#203b4b] px-3 py-2.5 rounded-full border border-[#cbd7db] shadow-sm hover:bg-[#edf3f5] transition-colors duration-150 flex items-center gap-1.5"
                >
                    <MessageSquarePlus className="w-4 h-4" />
                    <span className="text-xs font-medium">
                        ご意見
                    </span>
                </button>
            )}
        </div>
    );
}
