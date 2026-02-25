import { AIRouterClient } from './src/core/ai-router-client.ts';

async function test() {
  console.log('Testing AI Router Client with logging...');
  
  const client = new AIRouterClient({
    baseUrl: 'http://localhost:3002',
    defaultUseCase: 'memory-analysis'
  });
  
  // Test health check
  const healthy = await client.healthCheck();
  console.log('Health check:', healthy ? '✅ Healthy' : '❌ Unhealthy');
  
  if (!healthy) return;
  
  // Test simple chat
  const messages = [
    { role: 'user', content: 'Test memory analysis integration' }
  ];
  
  try {
    // Call chat method
    const response = await client.chat({
      messages,
      use_case: 'memory-analysis'
    });
    
    console.log('✅ Chat response received');
    console.log('Full response:', JSON.stringify(response, null, 2));
    console.log('Content:', response.message.content.substring(0, 150) + '...');
    if (response.onasis_metadata) {
      console.log('Metadata:', response.onasis_metadata);
    }
  } catch (error) {
    console.error('❌ Chat failed:', error.message);
    console.error(error.stack);
  }
}

test().catch(console.error);
