/** Temporary static UI fixtures for visual review. No calls to the live API or database. */
import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ForecastResult } from '../components/journey-result';
import { journeyDesignFixture } from '../tests/fixtures/journey-result';

const output = process.argv[2] || 'artifacts/design-review';
fs.mkdirSync(output, { recursive: true });
const css = fs.readFileSync('app/journey.css', 'utf8');
for (const scenario of ['official', 'unknown', 'all-day', 'unavailable'] as const) {
    const result = journeyDesignFixture(scenario);
    const html = renderToStaticMarkup(createElement(ForecastResult, { result, deadline: '', refresh() {}, selectDate() {}, edit() {} }));
    fs.writeFileSync(path.join(output, `${scenario}.html`), `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>画面確認用・架空の運休例</title><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',Meiryo,sans-serif}*{box-sizing:border-box}a{color:inherit}h1,h2,h3,p{margin:0}${css}</style></head><body><div style="padding:12px;background:#ffefd4;color:#6f430e;text-align:center;font-size:14px;font-weight:700">画面確認用・架空の例（実際の運行情報ではありません）</div><main class="journey-app"><div class="journey-shell has-result">${html}</div></main></body></html>`);
}
console.log(`Wrote four synthetic review pages to ${output}`);
