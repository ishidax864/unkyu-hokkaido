import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright設定ファイル - 視覚的回帰テスト用
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './tests/visual',

    // 並列実行設定
    fullyParallel: true,

    // CI環境でのみ失敗時にリトライ
    retries: process.env.CI ? 2 : 0,

    // 並列ワーカー数
    workers: process.env.CI ? 1 : undefined,

    // レポート設定
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['list'],
    ],

    // 共通設定
    use: {
        // ベースURL
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

        // スクリーンショット設定
        screenshot: 'only-on-failure',

        // ビデオ録画（失敗時のみ）
        video: 'retain-on-failure',

        // トレース（失敗時のみ）
        trace: 'retain-on-failure',

        // タイムアウト
        actionTimeout: 10000,
        navigationTimeout: 30000,
    },

    // テスト実行前に開発サーバーを起動
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
    },

    // 複数ブラウザ・デバイスでテスト
    projects: [
        {
            name: 'Desktop Chrome',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1920, height: 1080 },
            },
        },
        {
            name: 'Desktop Firefox',
            use: {
                ...devices['Desktop Firefox'],
                viewport: { width: 1920, height: 1080 },
            },
        },
        {
            name: 'Desktop Safari',
            use: {
                ...devices['Desktop Safari'],
                viewport: { width: 1920, height: 1080 },
            },
        },
        {
            name: 'Mobile Chrome',
            use: {
                ...devices['Pixel 5'],
            },
        },
        {
            name: 'Mobile Safari',
            use: {
                ...devices['iPhone 13'],
            },
        },
        {
            name: 'Tablet',
            use: {
                ...devices['iPad Pro'],
            },
        },
    ],

    // スナップショット設定
    expect: {
        toHaveScreenshot: {
            // ピクセル差異の許容値（アンチエイリアスやフォントレンダリングの差異を考慮）
            maxDiffPixels: 100,

            // 差異の閾値（0-1）
            threshold: 0.2,

            // アニメーションを無効化
            animations: 'disabled',


        },
    },
});
