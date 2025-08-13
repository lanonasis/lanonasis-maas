import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Play, 
  Square, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Activity,
  Zap,
  Brain,
  Network
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  action: string;
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  execution_time?: number;
  error?: string;
}

interface Workflow {
  id: string;
  request: string;
  status: 'analyzing' | 'planning' | 'executing' | 'completed' | 'failed';
  steps: WorkflowStep[];
  progress: number;
  estimated_duration?: number;
  started_at?: string;
  completed_at?: string;
  results?: any;
  next_actions?: string[];
}

export const WorkflowOrchestrator: React.FC = () => {
  const [request, setRequest] = useState('');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleExecuteWorkflow = async () => {
    if (!request.trim()) {
      toast({
        title: "Request required",
        description: "Please enter a workflow request",
        variant: "destructive"
      });
      return;
    }

    setIsExecuting(true);
    const workflowId = `workflow_${Date.now()}`;
    
    // Create initial workflow object
    const newWorkflow: Workflow = {
      id: workflowId,
      request: request.trim(),
      status: 'analyzing',
      steps: [],
      progress: 0,
      started_at: new Date().toISOString()
    };

    setWorkflows(prev => [newWorkflow, ...prev]);
    setActiveWorkflow(workflowId);

    try {
      // Connect to MCP SSE endpoint for real-time workflow execution
      const eventSource = new EventSource(`/mcp/orchestrate`, {
        // Headers don't work with EventSource, so we'll use query params
      });

      eventSource.onopen = () => {
        console.log('🔗 Connected to MCP Orchestrator');
        toast({
          title: "Workflow started",
          description: "AI is analyzing your request..."
        });
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Workflow update:', data);

          setWorkflows(prev => prev.map(workflow => {
            if (workflow.id === workflowId) {
              return {
                ...workflow,
                ...data,
                progress: data.progress || workflow.progress
              };
            }
            return workflow;
          }));

          // Update progress notifications
          if (data.status === 'completed') {
            toast({
              title: "Workflow completed",
              description: `Successfully executed ${data.steps?.length || 0} steps`
            });
            eventSource.close();
            setIsExecuting(false);
            setActiveWorkflow(null);
          } else if (data.status === 'failed') {
            toast({
              title: "Workflow failed", 
              description: data.error || "Unknown error occurred",
              variant: "destructive"
            });
            eventSource.close();
            setIsExecuting(false);
            setActiveWorkflow(null);
          }
        } catch (error) {
          console.error('Error parsing workflow update:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        toast({
          title: "Connection error",
          description: "Lost connection to orchestrator",
          variant: "destructive"
        });
        eventSource.close();
        setIsExecuting(false);
        setActiveWorkflow(null);
      };

      // Send the workflow request via POST to start orchestration
      const response = await fetch('/api/v1/orchestrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.session?.access_token}`
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          request: request.trim(),
          user_id: user?.id,
          real_time: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error('Workflow execution error:', error);
      toast({
        title: "Execution failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
      
      // Update workflow with error status
      setWorkflows(prev => prev.map(workflow => {
        if (workflow.id === workflowId) {
          return {
            ...workflow,
            status: 'failed',
            completed_at: new Date().toISOString()
          };
        }
        return workflow;
      }));
      
      setIsExecuting(false);
      setActiveWorkflow(null);
    }
  };

  const handleStopWorkflow = () => {
    if (activeWorkflow) {
      // Send stop signal to backend
      fetch(`/api/v1/orchestrate/${activeWorkflow}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.session?.access_token}`
        }
      });
      
      setIsExecuting(false);
      setActiveWorkflow(null);
      
      toast({
        title: "Workflow stopped",
        description: "Execution has been cancelled"
      });
    }
  };

  const getStatusIcon = (status: Workflow['status']) => {
    switch (status) {
      case 'analyzing':
        return <Brain className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'planning':
        return <Network className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'executing':
        return <Activity className="h-4 w-4 text-orange-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStepStatusIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'running':
        return <Activity className="h-3 w-3 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Request Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            AI Workflow Orchestrator
          </CardTitle>
          <CardDescription>
            Describe what you want to accomplish, and AI will plan and execute a multi-step workflow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Example: Analyze our Q3 sales data, create an executive summary report, and email it to the leadership team"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={3}
            disabled={isExecuting}
          />
          <div className="flex gap-2">
            <Button 
              onClick={handleExecuteWorkflow}
              disabled={isExecuting || !request.trim()}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Execute Workflow
            </Button>
            {isExecuting && (
              <Button 
                variant="outline" 
                onClick={handleStopWorkflow}
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workflow History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Workflow History</h3>
        {workflows.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">
                No workflows executed yet. Try the orchestrator above!
              </p>
            </CardContent>
          </Card>
        ) : (
          workflows.map((workflow) => (
            <Card key={workflow.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(workflow.status)}
                      <Badge variant={
                        workflow.status === 'completed' ? 'default' :
                        workflow.status === 'failed' ? 'destructive' : 'secondary'
                      }>
                        {workflow.status}
                      </Badge>
                      {workflow.estimated_duration && (
                        <span className="text-sm text-gray-500">
                          ~{workflow.estimated_duration}s
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{workflow.request}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {workflow.started_at && (
                      <div>Started: {new Date(workflow.started_at).toLocaleTimeString()}</div>
                    )}
                    {workflow.completed_at && (
                      <div>Completed: {new Date(workflow.completed_at).toLocaleTimeString()}</div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                {workflow.status !== 'completed' && workflow.status !== 'failed' && (
                  <Progress value={workflow.progress} className="w-full" />
                )}

                {/* Workflow Steps */}
                {workflow.steps.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Execution Steps:</h4>
                    <div className="space-y-1">
                      {workflow.steps.map((step, index) => (
                        <div key={step.id} className="flex items-center gap-3 text-sm">
                          <span className="w-6 text-gray-400">#{index + 1}</span>
                          {getStepStatusIcon(step.status)}
                          <span className="flex-1">{step.action}</span>
                          <Badge variant="outline" className="text-xs">
                            {step.tool}
                          </Badge>
                          {step.execution_time && (
                            <span className="text-xs text-gray-500">
                              {step.execution_time}ms
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results */}
                {workflow.results && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Results:</h4>
                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                      <pre className="whitespace-pre-wrap">
                        {typeof workflow.results === 'string' 
                          ? workflow.results 
                          : JSON.stringify(workflow.results, null, 2)
                        }
                      </pre>
                    </div>
                  </div>
                )}

                {/* Next Actions */}
                {workflow.next_actions && workflow.next_actions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Suggested Next Actions:</h4>
                    <ul className="space-y-1">
                      {workflow.next_actions.map((action, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};