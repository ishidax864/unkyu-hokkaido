async function testFeedbackApi() {
    console.log('Testing /api/feedback with "テスト"...');
    const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: 'bug',
            content: 'テスト投稿 by AI',
            email: 'test@example.com',
            pageUrl: 'http://localhost:3000/'
        })
    });

    const data = await response.json();
    console.log('Response:', response.status, data);
}

testFeedbackApi().catch(console.error);
