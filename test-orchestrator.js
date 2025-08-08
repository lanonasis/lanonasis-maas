// Quick test of the orchestrator functionality
import { parseOnly, orchestrate } from './src/orchestrator/index.js';

async function testOrchestrator() {
  console.log('🧠 Testing Orchestrator Natural Language Parsing...\n');
  
  const testCommands = [
    "search for API documentation",
    "create memory about today's meeting",
    "open memory visualizer", 
    "show my project memories",
    "list my topics"
  ];
  
  for (const command of testCommands) {
    try {
      console.log(`📝 Command: "${command}"`);
      
      // Test parsing only
      const parsed = await parseOnly(command);
      console.log(`✅ Parsed:`, {
        tool: parsed.tool,
        action: parsed.action,
        confidence: Math.round((parsed.confidence || 0) * 100) + '%'
      });
      
      console.log('---');
    } catch (error) {
      console.error(`❌ Error parsing "${command}":`, error.message);
      console.log('---');
    }
  }
  
  console.log('\n🎯 Orchestrator parsing test complete!');
}

testOrchestrator().catch(console.error);