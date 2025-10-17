#!/usr/bin/env node

const https = require('https');
const http = require('http');

const PRODUCTION_URL = 'https://lepetitdavinci-api.vercel.app';
const LOCAL_URL = 'http://localhost:3000';

// Note: Run this script from the project root directory
// Usage: node testing/test-api-comprehensive.js

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

// Test function with better formatting
async function testEndpoint(url, name, expectedStatus = 200) {
    return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;

        console.log(`${colors.cyan}🔍 Testing ${name}${colors.reset}`);
        console.log(`   ${colors.blue}URL:${colors.reset} ${url}`);

        const startTime = Date.now();

        const req = client.get(url, (res) => {
            const duration = Date.now() - startTime;
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const status = res.statusCode === expectedStatus ? '✅' : '❌';
                const statusColor = res.statusCode === expectedStatus ? colors.green : colors.red;

                console.log(`   ${statusColor}${status} Status: ${res.statusCode}${colors.reset} (${duration}ms)`);

                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`   ${colors.green}✅ Response:${colors.reset}`);
                        console.log(`   ${JSON.stringify(json, null, 6).split('\n').map(line => '   ' + line).join('\n')}`);
                    } catch (e) {
                        console.log(`   ${colors.green}✅ Response:${colors.reset} ${data}`);
                    }
                } else {
                    console.log(`   ${colors.red}❌ Error:${colors.reset} ${data}`);
                }

                resolve({
                    success: res.statusCode === expectedStatus,
                    status: res.statusCode,
                    duration,
                    data: res.statusCode === 200 ? data : null
                });
            });
        });

        req.on('error', (err) => {
            console.log(`   ${colors.red}❌ Network Error:${colors.reset} ${err.message}`);
            resolve({
                success: false,
                error: err.message,
                duration: Date.now() - startTime
            });
        });

        req.setTimeout(10000, () => {
            console.log(`   ${colors.red}❌ Timeout${colors.reset}`);
            req.destroy();
            resolve({
                success: false,
                error: 'Timeout',
                duration: Date.now() - startTime
            });
        });
    });
}

async function runComprehensiveTests() {
    console.log(`${colors.bold}${colors.cyan}🚀 Le Petit Davinci API - Comprehensive Testing${colors.reset}\n`);
    console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);

    const endpoints = [
        // Health endpoints
        { url: `${PRODUCTION_URL}/api/health`, name: 'Health Check (Production)', category: 'Health' },
        { url: `${PRODUCTION_URL}/api/ping`, name: 'Ping (Production)', category: 'Health' },
        { url: `${PRODUCTION_URL}/api/status`, name: 'Status (Production)', category: 'Health' },
        { url: `${LOCAL_URL}/api/health`, name: 'Health Check (Local)', category: 'Health' },
        { url: `${LOCAL_URL}/api/ping`, name: 'Ping (Local)', category: 'Health' },
        { url: `${LOCAL_URL}/api/status`, name: 'Status (Local)', category: 'Health' },

        // Auth endpoints
        { url: `${PRODUCTION_URL}/auth/google`, name: 'Google OAuth (Production)', category: 'Auth' },
        { url: `${LOCAL_URL}/auth/google`, name: 'Google OAuth (Local)', category: 'Auth' },

        // User endpoints (these will likely fail without auth)
        { url: `${PRODUCTION_URL}/user/profile`, name: 'User Profile (Production)', category: 'User', expectedStatus: 401 },
        { url: `${LOCAL_URL}/user/profile`, name: 'User Profile (Local)', category: 'User', expectedStatus: 401 },

        // Subscription endpoints (these will likely fail without auth)
        { url: `${PRODUCTION_URL}/api/subscriptions/status`, name: 'Subscription Status (Production)', category: 'Subscription', expectedStatus: 401 },
        { url: `${LOCAL_URL}/api/subscriptions/status`, name: 'Subscription Status (Local)', category: 'Subscription', expectedStatus: 401 }
    ];

    const results = {
        total: endpoints.length,
        successful: 0,
        failed: 0,
        byCategory: {}
    };

    // Group endpoints by category
    const categories = [...new Set(endpoints.map(ep => ep.category))];

    for (const category of categories) {
        console.log(`\n${colors.bold}${colors.blue}📁 ${category} Endpoints${colors.reset}`);
        console.log(`${colors.yellow}${'-'.repeat(40)}${colors.reset}`);

        const categoryEndpoints = endpoints.filter(ep => ep.category === category);

        for (const endpoint of categoryEndpoints) {
            const result = await testEndpoint(
                endpoint.url,
                endpoint.name,
                endpoint.expectedStatus || 200
            );

            if (result.success) {
                results.successful++;
            } else {
                results.failed++;
            }

            // Track by category
            if (!results.byCategory[category]) {
                results.byCategory[category] = { successful: 0, failed: 0 };
            }

            if (result.success) {
                results.byCategory[category].successful++;
            } else {
                results.byCategory[category].failed++;
            }

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // Summary
    console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.bold}📊 Test Results Summary${colors.reset}`);
    console.log(`${colors.green}✅ Successful: ${results.successful}/${results.total}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${results.failed}/${results.total}${colors.reset}`);

    console.log(`\n${colors.bold}📈 Results by Category:${colors.reset}`);
    for (const [category, stats] of Object.entries(results.byCategory)) {
        const total = stats.successful + stats.failed;
        const percentage = total > 0 ? Math.round((stats.successful / total) * 100) : 0;
        console.log(`   ${colors.blue}${category}:${colors.reset} ${stats.successful}/${total} (${percentage}%)`);
    }

    // Recommendations
    console.log(`\n${colors.bold}💡 Recommendations:${colors.reset}`);

    if (results.successful === results.total) {
        console.log(`${colors.green}🎉 All endpoints are working perfectly!${colors.reset}`);
        console.log(`${colors.cyan}   Your API is ready for production use.${colors.reset}`);
    } else if (results.successful > results.total * 0.8) {
        console.log(`${colors.yellow}⚠️  Most endpoints are working. Check failed endpoints above.${colors.reset}`);
    } else {
        console.log(`${colors.red}❌ Many endpoints are failing. Check your deployment and configuration.${colors.reset}`);
    }

    // Postman collection info
    console.log(`\n${colors.bold}📋 Postman Collection:${colors.reset}`);
    console.log(`${colors.cyan}   Import the postman-collection.json file into Postman for detailed testing.${colors.reset}`);
    console.log(`${colors.blue}   Base URL: ${PRODUCTION_URL}${colors.reset}`);

    return results;
}

// Run the tests
runComprehensiveTests().catch(console.error);
