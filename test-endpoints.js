#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BASE_URL = 'https://lepetitdavinci-api.vercel.app';
const LOCAL_URL = 'http://localhost:3000';

// Test function
async function testEndpoint(url, name) {
    return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;

        console.log(`\n🔍 Testing ${name}...`);
        console.log(`   URL: ${url}`);

        const req = client.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`   Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`   ✅ Success: ${JSON.stringify(json, null, 2)}`);
                    } catch (e) {
                        console.log(`   ✅ Success: ${data}`);
                    }
                } else {
                    console.log(`   ❌ Error: ${data}`);
                }
                resolve(res.statusCode === 200);
            });
        });

        req.on('error', (err) => {
            console.log(`   ❌ Network Error: ${err.message}`);
            resolve(false);
        });

        req.setTimeout(10000, () => {
            console.log(`   ❌ Timeout`);
            req.destroy();
            resolve(false);
        });
    });
}

async function runTests() {
    console.log('🚀 Testing Le Petit Davinci API Endpoints\n');
    console.log('='.repeat(50));

    const endpoints = [
        { url: `${BASE_URL}/api/health`, name: 'Health Check (Production)' },
        { url: `${BASE_URL}/api/ping`, name: 'Ping (Production)' },
        { url: `${BASE_URL}/api/status`, name: 'Status (Production)' },
        { url: `${LOCAL_URL}/api/health`, name: 'Health Check (Local)' },
        { url: `${LOCAL_URL}/api/ping`, name: 'Ping (Local)' },
        { url: `${LOCAL_URL}/api/status`, name: 'Status (Local)' }
    ];

    let successCount = 0;

    for (const endpoint of endpoints) {
        const success = await testEndpoint(endpoint.url, endpoint.name);
        if (success) successCount++;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Results: ${successCount}/${endpoints.length} endpoints working`);

    if (successCount === 0) {
        console.log('\n❌ No endpoints are working. Possible issues:');
        console.log('   - Server not deployed to Vercel');
        console.log('   - Vercel configuration needs updating');
        console.log('   - Local server not running');
        console.log('\n💡 Next steps:');
        console.log('   1. Deploy to Vercel: vercel --prod');
        console.log('   2. Start local server: npm run dev');
        console.log('   3. Check Vercel logs for deployment issues');
    } else if (successCount < endpoints.length) {
        console.log('\n⚠️  Some endpoints are not working. Check the errors above.');
    } else {
        console.log('\n🎉 All endpoints are working perfectly!');
    }
}

runTests().catch(console.error);
