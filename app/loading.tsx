import { Train } from 'lucide-react';

export default function Loading() {
    return (
        <main className="min-h-screen bg-[var(--background-secondary)] flex items-center justify-center">
            <div className="text-center">
                <div className="relative mb-4">
                    <Train className="w-12 h-12 text-[var(--primary)] animate-bounce" />
                </div>
                <div className="flex items-center gap-2 text-[var(--muted)]">
                    <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
            </div>
        </main>
    );
}
