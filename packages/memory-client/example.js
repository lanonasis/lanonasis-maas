// Example usage of @lanonasis/memory-client
import { createMemoryClient } from './dist/index.esm.js';

async function example() {
  // Create a client
  const client = createMemoryClient({
    apiUrl: 'https://api.lanonasis.com',
    apiKey: 'your-api-key-here',
    useGateway: true
  });

  console.log('Memory Client created successfully!');
  console.log('Client config:', client.getConfig());
  
  // Test health check (would need real API key to work)
  try {
    console.log('Testing connection...');
    // const health = await client.healthCheck();
    // console.log('Health:', health);
  } catch (error) {
    console.log('Connection test skipped (demo mode)');
  }
}

// Run example
example().then(() => {
  console.log('Example completed!');
}).catch(console.error);