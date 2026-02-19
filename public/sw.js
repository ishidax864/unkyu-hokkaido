
const CACHE_NAME = 'unkyu-ai-v7';
const STATIC_CACHE_NAME = 'unkyu-ai-static-v7';
const DYNAMIC_CACHE_NAME = 'unkyu-ai-dynamic-v7';

// 静的アセット（常にキャッシュ）
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/favicon.ico',
];

// APIキャッシュ対象（短期キャッシュ）
const API_CACHE_PATTERNS = [
    /\/api\/health/,
];

// キャッシュしないパス
const NO_CACHE_PATTERNS = [
    /\/_next\/webpack-hmr/,
    /\/api\/(?!health)/,
];

// インストール時に静的アセットをキャッシュ
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('unkyu-ai-') && name !== CACHE_NAME && name !== STATIC_CACHE_NAME && name !== DYNAMIC_CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// フェッチ戦略
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // キャッシュしないパスはスキップ
    if (NO_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
        return;
    }

    // ナビゲーションリクエスト（HTML）
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match('/'))
        );
        return;
    }

    // 静的アセット（Cache First）
    if (STATIC_ASSETS.includes(url.pathname) || url.pathname.startsWith('/_next/static/')) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                return cached || fetch(event.request).then((response) => {
                    const clone = response.clone();
                    caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return response;
                });
            })
        );
        return;
    }

    // APIリクエスト（Network First with short cache）
    if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(DYNAMIC_CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // その他（Stale While Revalidate）
    event.respondWith(
        caches.match(event.request).then((cached) => {
            const fetchPromise = fetch(event.request).then((response) => {
                const clone = response.clone();
                caches.open(DYNAMIC_CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            });
            return cached || fetchPromise;
        })
    );
});

// プッシュ通知（将来用）
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || '運休リスクが高まっています',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'unkyu-notification',
        data: { url: data.url || '/' },
    };

    event.waitUntil(
        self.registration.showNotification(data.title || '運休AI', options)
    );
});

// 通知クリック
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            for (const client of clients) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            return self.clients.openWindow(url);
        })
    );
});
