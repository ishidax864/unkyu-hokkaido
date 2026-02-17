import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'happy-dom',
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                '.next/**',
                'tests/**',
                '**/*.test.ts',
                '**/*.test.tsx',
                'scripts/**',
                'playwright.config.ts',
                'next.config.ts',
                'tailwind.config.ts',
                'postcss.config.mjs',
            ],
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 70,
                statements: 70,
            },
        },
        include: ['**/*.test.ts', '**/*.test.tsx'],
        setupFiles: ['./vitest.setup.ts'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
        },
    },
});
