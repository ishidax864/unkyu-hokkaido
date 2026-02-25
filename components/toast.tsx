'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast container */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none max-w-[90vw]">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
    useEffect(() => {
        const timer = setTimeout(() => onRemove(toast.id), 3000);
        return () => clearTimeout(timer);
    }, [toast.id, onRemove]);

    const icons = {
        success: <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />,
        error: <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />,
        info: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
    };

    const bgColors = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
    };

    return (
        <div
            className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${bgColors[toast.type]}`}
            role="alert"
        >
            {icons[toast.type]}
            <span>{toast.message}</span>
            <button
                onClick={() => onRemove(toast.id)}
                className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
                aria-label="閉じる"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
