/* eslint-env node */
/* global require, process, console, exports, fetch */

const { createClient } = require('@supabase/supabase-js');

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// AI Workflow Orchestrator
class AIWorkflowOrchestrator {
  constructor() {
    this.workflows = new Map();
  }

  async orchestrate(request, workflowId, userId) {
    console.log(`🎯 Starting orchestration for workflow ${workflowId}`);
    
    // 1. Analyze and decompose the request
    const workflow = await this.analyzeRequest(request, workflowId, userId);
    
    // 2. Plan execution strategy
    const executionPlan = await this.planExecution(workflow);
    
    // 3. Execute workflow with real-time updates
    const results = await this.executeWorkflow(executionPlan);
    
    return {
      workflow_id: workflowId,
      status: 'completed',
      results: results,
      execution_summary: this.generateSummary(results),
      next_actions: await this.suggestNextActions(results)
    };
  }

  async analyzeRequest(request, workflowId, userId) {
    // Use OpenAI to decompose the request into actionable steps
    const prompt = `
    Analyze this business request and break it down into specific, actionable steps:
    "${request}"
    
    Available tools:
    - ai_chat: AI analysis and content generation
    - memory_search: Search organizational memory/knowledge
    - data_analytics: Query and analyze data
    - email_sender: Send emails
    - document_generator: Create reports and documents
    - clickup_api: Project management operations
    - telegram_bot: Send notifications
    
    Return a JSON workflow plan with:
    {
      "workflow_type": "simple|complex|enterprise",
      "estimated_duration": seconds,
      "steps": [
        {
          "id": "step_1",
          "action": "descriptive_action_name",
          "tool": "tool_name",
          "params": {},
          "depends_on": [],
          "can_parallel": true/false
        }
      ]
    }
    `;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are an AI workflow orchestrator. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3
        })
      });

      const data = await response.json();
      const workflowPlan = JSON.parse(data.choices[0].message.content);
      
      return {
        id: workflowId,
        user_id: userId,
        request: request,
        plan: workflowPlan,
        status: 'planning',
        created_at: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error analyzing request:', error);
      throw new Error('Failed to analyze workflow request');
    }
  }

  async planExecution(workflow) {
    // Group steps into execution phases based on dependencies
    const steps = workflow.plan.steps;
    const phases = [];
    const completed = new Set();
    
    while (completed.size < steps.length) {
      const readySteps = steps.filter(step => 
        !completed.has(step.id) && 
        step.depends_on.every(dep => completed.has(dep))
      );
      
      if (readySteps.length === 0) {
        throw new Error('Circular dependency detected in workflow');
      }
      
      // Group parallel vs sequential steps
      const parallelSteps = readySteps.filter(step => step.can_parallel);
      const sequentialSteps = readySteps.filter(step => !step.can_parallel);
      
      if (parallelSteps.length > 0) {
        phases.push({
          type: 'parallel',
          steps: parallelSteps
        });
        parallelSteps.forEach(step => completed.add(step.id));
      }
      
      if (sequentialSteps.length > 0) {
        phases.push({
          type: 'sequential', 
          steps: sequentialSteps
        });
        sequentialSteps.forEach(step => completed.add(step.id));
      }
    }
    
    return {
      ...workflow,
      execution_phases: phases,
      status: 'ready_to_execute'
    };
  }

  async executeWorkflow(executionPlan) {
    const results = [];
    const context = {
      workflow_id: executionPlan.id,
      user_id: executionPlan.user_id,
      previous_results: []
    };

    for (const phase of executionPlan.execution_phases) {
      if (phase.type === 'parallel') {
        // Execute steps in parallel
        const phaseResults = await Promise.allSettled(
          phase.steps.map(step => this.executeStep(step, context))
        );
        results.push(...phaseResults.map(r => r.value || r.reason));
      } else {
        // Execute steps sequentially
        for (const step of phase.steps) {
          const result = await this.executeStep(step, context);
          results.push(result);
          context.previous_results.push(result);
        }
      }
    }

    return results;
  }

  async executeStep(step, context) {
    const startTime = Date.now();
    
    try {
      console.log(`⚡ Executing step: ${step.action} using ${step.tool}`);
      
      let result;
      
      switch (step.tool) {
        case 'ai_chat':
          result = await this.executeAIChat(step.params, context);
          break;
        case 'memory_search':
          result = await this.executeMemorySearch(step.params, context);
          break;
        case 'data_analytics':
          result = await this.executeDataAnalytics(step.params, context);
          break;
        case 'email_sender':
          result = await this.executeEmailSender(step.params, context);
          break;
        case 'document_generator':
          result = await this.executeDocumentGenerator(step.params, context);
          break;
        default:
          result = { error: `Tool ${step.tool} not implemented yet` };
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        step_id: step.id,
        action: step.action,
        tool: step.tool,
        status: 'completed',
        result: result,
        execution_time: executionTime,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`Error executing step ${step.id}:`, error);
      return {
        step_id: step.id,
        action: step.action,
        tool: step.tool,
        status: 'failed',
        error: error.message,
        execution_time: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  async executeAIChat(params, context) {
    // Enhanced AI chat with context awareness
    const contextPrompt = context.previous_results.length > 0 
      ? `\n\nContext from previous steps:\n${JSON.stringify(context.previous_results, null, 2)}`
      : '';
      
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: params.system_prompt || 'You are a helpful AI assistant.' },
          { role: 'user', content: `${params.prompt}${contextPrompt}` }
        ],
        temperature: params.temperature || 0.7
      })
    });

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      model: 'gpt-4',
      tokens_used: data.usage?.total_tokens
    };
  }

  async executeMemorySearch(params, context) {
    // Search organizational memory
    const { data, error } = await supabase
      .from('memory_entries')
      .select('*')
      .textSearch('content', params.query)
      .eq('user_id', context.user_id)
      .limit(params.limit || 10);

    if (error) throw error;

    return {
      query: params.query,
      results_count: data.length,
      memories: data
    };
  }

  async executeDataAnalytics(params, context) {
    // Execute data analytics queries
    const { data, error } = await supabase
      .from(params.table || 'usage_analytics')
      .select(params.select || '*')
      .limit(params.limit || 100);

    if (error) throw error;

    return {
      table: params.table,
      query: params.select,
      results_count: data.length,
      data: data
    };
  }

  async executeEmailSender(params, context) {
    // Mock email sender - replace with actual email service
    return {
      to: params.to,
      subject: params.subject,
      body: params.body,
      status: 'sent',
      message: 'Email sending not implemented - mock response'
    };
  }

  async executeDocumentGenerator(params, context) {
    // Mock document generator - replace with actual document service
    return {
      document_type: params.type,
      template: params.template,
      content_length: params.content?.length || 0,
      status: 'generated',
      document_url: 'https://example.com/document.pdf',
      message: 'Document generation not implemented - mock response'
    };
  }

  generateSummary(results) {
    const successfulSteps = results.filter(r => r.status === 'completed').length;
    const failedSteps = results.filter(r => r.status === 'failed').length;
    const totalTime = results.reduce((sum, r) => sum + (r.execution_time || 0), 0);

    return `Executed ${successfulSteps} steps successfully, ${failedSteps} failed. Total execution time: ${totalTime}ms`;
  }

  async suggestNextActions(results) {
    // AI-powered next action suggestions
    const prompt = `Based on these workflow results, suggest 3 logical next actions:
    ${JSON.stringify(results, null, 2)}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'Suggest practical next actions based on workflow results. Return a JSON array of strings.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7
        })
      });

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      return ['Review results', 'Plan follow-up actions', 'Share with team'];
    }
  }
}

// Netlify function handler
exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Content-Type': 'application/json'
  };

  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { workflow_id, request, user_id, real_time = false } = body;

    if (!workflow_id || !request || !user_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: workflow_id, request, user_id' 
        })
      };
    }

    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error: missing environment variables' 
        })
      };
    }

    // Create orchestrator instance
    const orchestrator = new AIWorkflowOrchestrator();

    // Execute workflow
    console.log(`🚀 Starting workflow orchestration: ${workflow_id}`);
    const result = await orchestrator.orchestrate(request, workflow_id, user_id);

    // Store workflow in database for history
    await supabase
      .from('orchestration_workflows')
      .insert({
        id: workflow_id,
        user_id: user_id,
        request: request,
        status: result.status,
        results: result.results,
        execution_summary: result.execution_summary,
        next_actions: result.next_actions,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Orchestration error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Orchestration failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};