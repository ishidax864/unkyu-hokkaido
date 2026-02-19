import { JR_JSON_URLS, extractNumericalStatus } from '../lib/jr-status';

const BASE_URL = 'https://www3.jrhokkaido.co.jp/webunkou/json/area/area_';

async function dryRunCrawler() {
    console.log('🤖 Starting Crawler Dry-Run (Logic Verification)...\n');

    // Just test one area (Sapporo)
    const area = JR_JSON_URLS[0];
    const url = `${BASE_URL}${area.id}.json`;
    console.log(`📡 Fetching ${area.area} (${url})...`);

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        const json = JSON.parse(text.replace(/^\uFEFF/, ''));

        console.log('✅ Network Fetch: Success');

        const gaikyoList = json.today?.gaikyo || [];
        console.log(`📊 Data Found: ${gaikyoList.length} items in gaikyo`);

        if (gaikyoList.length > 0) {
            const sample = gaikyoList[0];
            const content = (sample.honbun || '') + (sample.title || '');
            console.log(`\n📄 Sample Content: "${content.substring(0, 100)}..."`);

            const { delayMinutes, recoveryTime } = extractNumericalStatus(content);
            console.log(`🧪 Parsing Test:`);
            console.log(`  - Delay Minutes: ${delayMinutes}`);
            console.log(`  - Recovery Time: ${recoveryTime}`);
        } else {
            console.log('ℹ️ No active incidents reported in this area currently.');
        }

        console.log('\n🏁 Dry-run finished. Crawler logic is healthy.');
    } catch (e) {
        console.error('❌ Dry-run failed:', e);
    }
}

dryRunCrawler();
