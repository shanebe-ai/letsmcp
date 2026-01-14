import { createServer } from './src/server.js';

// Simple test to verify tools are registered
async function testTools() {
    console.log('🧪 Testing MCP Tools\n');

    const server = createServer();

    // List available tools
    console.log('📋 Listing available tools...');
    const toolsList = await server.request({
        method: 'tools/list',
        params: {}
    });

    console.log('Available tools:', toolsList.tools.map((t: any) => t.name).join(', '));
    console.log();

    console.log('✅ Tools registered successfully!');
    console.log('\nTo test the tools interactively, use Claude Desktop or Antigravity.');
    console.log('Example queries:');
    console.log('  - "Can you echo \'Hello, World!\' for me?"');
    console.log('  - "Can you summarize the src directory?"');

    process.exit(0);
}

testTools().catch(console.error);
