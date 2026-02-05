'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // 本番環境ではエラー監視サービスに送信
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Sentryなどに送信する場合
        // if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
        //   Sentry.captureException(error);
        // }
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-[var(--background-secondary)] flex items-center justify-center p-4">
                    <div className="card p-8 max-w-md text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-[var(--status-suspended)]" />
                        </div>
                        <h1 className="text-xl font-bold mb-2">エラーが発生しました</h1>
                        <p className="text-sm text-[var(--muted)] mb-6">
                            ご不便をおかけして申し訳ございません。<br />
                            しばらく時間をおいて再度お試しください。
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                再読み込み
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="px-4 py-2 text-sm border border-[var(--border)] rounded-md hover:bg-[var(--background-secondary)] flex items-center gap-2"
                            >
                                <Home className="w-4 h-4" />
                                トップへ
                            </button>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="text-xs text-[var(--muted)] cursor-pointer">
                                    デバッグ情報
                                </summary>
                                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
