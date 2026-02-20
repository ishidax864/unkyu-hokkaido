'use client';

import Link from 'next/link';
import { LayoutDashboard, MessageSquare, LogOut, Train, BrainCircuit } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const navItems = [
        { href: '/admin', label: 'ダッシュボード', icon: LayoutDashboard },
        { href: '/admin/crawler', label: 'データ収集 & ML', icon: BrainCircuit },
        { href: '/admin/status', label: '運行状況監視', icon: Train },
        { href: '/admin/reports', label: 'ユーザー報告', icon: MessageSquare },
    ];

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-[var(--primary)] text-white flex flex-col">
                <div className="p-6 flex items-center gap-2 border-b border-white/10">
                    <Train className="w-6 h-6" />
                    <span className="font-bold text-lg">運休北海道 Admin</span>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                    isActive
                                        ? "bg-white/10 font-bold"
                                        : "hover:bg-white/5 opacity-80"
                                )}
                            >
                                <Icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <Link
                        href="/"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 opacity-80"
                    >
                        <LogOut className="w-5 h-5" />
                        サイトへ戻る
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
                    <h2 className="font-bold text-gray-800">
                        {navItems.find(i => i.href === pathname)?.label || '管理画面'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-sm font-bold">管理者</div>
                            <div className="text-[10px] text-gray-500">システム管理</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold">
                            管
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-8 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
