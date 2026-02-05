'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
            window.addEventListener('load', () => {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((registration) => {
                        console.log('SW registered:', registration.scope);

                        // 更新チェック
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            if (newWorker) {
                                newWorker.addEventListener('statechange', () => {
                                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                        // 新しいバージョンが利用可能
                                        if (confirm('新しいバージョンがあります。更新しますか？')) {
                                            window.location.reload();
                                        }
                                    }
                                });
                            }
                        });
                    })
                    .catch((error) => {
                        console.error('SW registration failed:', error);
                    });
            });
        }
    }, []);

    return null;
}

// プッシュ通知の購読
export async function subscribeToPush(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        // 既存の購読を確認
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // 新規購読（VAPID公開鍵が必要）
            // const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            // subscription = await registration.pushManager.subscribe({
            //     userVisibleOnly: true,
            //     applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            // });
        }

        return subscription;
    } catch (error) {
        console.error('Push subscription failed:', error);
        return null;
    }
}

// 通知の許可を要求
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission !== 'denied') {
        return await Notification.requestPermission();
    }

    return Notification.permission;
}
