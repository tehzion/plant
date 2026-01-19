/**
 * Test Script for Dual-API System
 * Tests PlantNet + GPT-4o integration
 */

import fetch from 'node-fetch';
import fs from 'fs';

const API_URL = 'http://localhost:3001';

console.log('🧪 Testing Dual-API Plant Detection System\n');

// Test 1: Health Check
async function testHealth() {
    console.log('📋 Test 1: Health Check');
    try {
        const response = await fetch(`${API_URL}/api/health`);
        const data = await response.json();

        console.log('  Status:', data.status);
        console.log('  PlantNet Enabled:', data.plantNetEnabled ? '✅' : '❌');
        console.log('  OpenAI Enabled:', data.openAIEnabled ? '✅' : '❌');

        if (data.plantNetEnabled && data.openAIEnabled) {
            console.log('  ✅ Health check passed!\n');
            return true;
        } else {
            console.log('  ❌ Missing API configuration\n');
            return false;
        }
    } catch (error) {
        console.log('  ❌ Server not reachable:', error.message);
        console.log('  💡 Make sure server is running: npm run dev\n');
        return false;
    }
}

// Test 2: Analyze endpoint (requires actual image)
async function testAnalyze() {
    console.log('📋 Test 2: Analysis Endpoint');
    console.log('  ℹ️  This test requires uploading an image from the frontend');
    console.log('  ℹ️  You can test it by using the web app\n');

    // Example of what the request should look like:
    console.log('  Example request format:');
    console.log(`  POST ${API_URL}/api/analyze`);
    console.log('  Body: {');
    console.log('    "treeImage": "data:image/jpeg;base64,...",');
    console.log('    "leafImage": "data:image/jpeg;base64,...", // optional');
    console.log('    "category": "Durian Tree",');
    console.log('    "language": "en"');
    console.log('  }\n');
}

// Run tests
async function runTests() {
    console.log('═'.repeat(50));
    console.log('  Dual-API System Test Suite');
    console.log('═'.repeat(50) + '\n');

    const healthPassed = await testHealth();

    if (healthPassed) {
        await testAnalyze();

        console.log('═'.repeat(50));
        console.log('✅ System is ready for use!');
        console.log('═'.repeat(50));
        console.log('\n📝 Next steps:');
        console.log('  1. Start the frontend: npm run dev (in main folder)');
        console.log('  2. Upload a plant image');
        console.log('  3. Check the browser console and server logs');
        console.log('\n🔍 You should see:');
        console.log('  - PlantNet identifying species first');
        console.log('  - GPT-4o analyzing with species context');
        console.log('  - Combined result with both data sources\n');
    } else {
        console.log('═'.repeat(50));
        console.log('❌ System not ready');
        console.log('═'.repeat(50));
        console.log('\n🔧 Troubleshooting:');
        console.log('  1. Make sure server is running:');
        console.log('     cd server && npm run dev');
        console.log('  2. Check .env file has both API keys:');
        console.log('     OPENAI_API_KEY=sk-...');
        console.log('     PLANTNET_API_KEY=2b10...');
        console.log('  3. Install dependencies if needed:');
        console.log('     npm install\n');
    }
}

runTests();
