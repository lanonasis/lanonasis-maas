import { AIRouterClient } from './src/core/ai-router-client.ts';

async function test() {
  console.log('Testing AI Router Client...');
  
  const client = new AIRouterClient({
    baseUrl: 'http://localhost:3002',
    defaultUseCase: 'memory-analysis'
  });
  
  // Test health check
  const healthy = await client.healthCheck();
  console.log('Health check:', healthy ? '✅ Healthy' : '❌ Unhealthy');
  
  if (!healthy) {
    console.error('AI Router is not healthy');
    return;
  }
  
  // Test simple chat
  const messages = [
    { role: 'user', content: 'Test memory analysis integration' }
  ];
  
  try {
    const response = await client.chat({
      messages,
      use_case: 'memory-analysis'
    });
    
    console.log('✅ Chat response received');
    console.log('Response content:', response.message.content.substring(0, 100) + '...');
    console.log('Onasis metadata:', response.onasis_metadata);
    console.log('Usage:', response.usage);
  } catch (error) {
    console.error('❌ Chat failed:', error.message);
  }
}

test().catch(console.error);
