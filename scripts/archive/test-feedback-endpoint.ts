async function testFeedbackApi() {
    console.log('Testing http://127.0.0.1:3000/api/feedback with "テスト"...');
    try {
        const response = await fetch('http://127.0.0.1:3000/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'bug',
                content: 'テスト投稿 (API経由)',
                email: 'test@example.com',
                pageUrl: 'http://127.0.0.1:3000/'
            })
        });

        const data = await response.json();
        console.log('Response:', response.status, data);
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

testFeedbackApi().catch(console.error);
