-- Create table for MCP workflow orchestration
CREATE TABLE IF NOT EXISTS orchestration_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID,
    request TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('analyzing', 'planning', 'executing', 'completed', 'failed')),
    workflow_plan JSONB,
    steps JSONB DEFAULT '[]',
    results JSONB,
    execution_summary TEXT,
    next_actions JSONB DEFAULT '[]',
    estimated_duration INTEGER, -- in seconds
    actual_duration INTEGER, -- in seconds
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orchestration_workflows_user_id ON orchestration_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_workflows_organization_id ON orchestration_workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_workflows_status ON orchestration_workflows(status);
CREATE INDEX IF NOT EXISTS idx_orchestration_workflows_created_at ON orchestration_workflows(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE orchestration_workflows ENABLE ROW LEVEL SECURITY;

-- Create policies for orchestration workflows
CREATE POLICY "Users can view their own workflows" ON orchestration_workflows
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflows" ON orchestration_workflows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows" ON orchestration_workflows
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows" ON orchestration_workflows
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_orchestration_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_orchestration_workflows_updated_at 
  BEFORE UPDATE ON orchestration_workflows 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_orchestration_workflows_updated_at();

-- Create function to calculate actual duration
CREATE OR REPLACE FUNCTION calculate_workflow_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate actual duration when workflow is completed
  IF NEW.status IN ('completed', 'failed') AND NEW.started_at IS NOT NULL AND NEW.completed_at IS NOT NULL THEN
    NEW.actual_duration = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at));
  END IF;
  
  -- Set started_at when workflow begins executing
  IF NEW.status = 'executing' AND OLD.status != 'executing' AND NEW.started_at IS NULL THEN
    NEW.started_at = NOW();
  END IF;
  
  -- Set completed_at when workflow finishes
  IF NEW.status IN ('completed', 'failed') AND OLD.status NOT IN ('completed', 'failed') AND NEW.completed_at IS NULL THEN
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS calculate_orchestration_workflow_duration 
  BEFORE UPDATE ON orchestration_workflows 
  FOR EACH ROW 
  EXECUTE PROCEDURE calculate_workflow_duration();

-- Create view for workflow analytics
CREATE OR REPLACE VIEW orchestration_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  status,
  COUNT(*) as workflow_count,
  AVG(actual_duration) as avg_duration,
  AVG(estimated_duration) as avg_estimated_duration,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
  COUNT(DISTINCT user_id) as unique_users
FROM orchestration_workflows
GROUP BY DATE_TRUNC('day', created_at), status
ORDER BY date DESC;

-- Grant access to the analytics view
GRANT SELECT ON orchestration_analytics TO authenticated;

-- Insert some example workflow templates for testing
INSERT INTO orchestration_workflows (
  id,
  user_id, 
  request, 
  status, 
  workflow_plan,
  execution_summary,
  next_actions,
  estimated_duration,
  actual_duration,
  created_at,
  completed_at
) VALUES 
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001', -- Replace with actual user ID
  'Analyze our Q3 sales data and create executive dashboard',
  'completed',
  '{"workflow_type": "complex", "steps": [{"id": "step_1", "action": "data_extraction", "tool": "data_analytics"}, {"id": "step_2", "action": "ai_analysis", "tool": "ai_chat"}, {"id": "step_3", "action": "report_generation", "tool": "document_generator"}]}',
  'Successfully analyzed Q3 sales data, generated insights, and created executive dashboard. Total execution time: 45 seconds.',
  '["Schedule presentation with leadership team", "Set up automated monthly reports", "Share insights with sales team"]',
  60,
  45,
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour' + INTERVAL '45 seconds'
),
(
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001', -- Replace with actual user ID
  'Create weekly content package for social media',
  'completed',
  '{"workflow_type": "simple", "steps": [{"id": "step_1", "action": "trend_research", "tool": "web_scraper"}, {"id": "step_2", "action": "content_creation", "tool": "ai_chat"}, {"id": "step_3", "action": "social_scheduling", "tool": "social_scheduler"}]}',
  'Created comprehensive weekly content package including blog post, social media posts, and scheduled publication. Total execution time: 30 seconds.',
  '["Review content performance", "Adjust posting schedule", "Plan next week content themes"]',
  40,
  30,
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours' + INTERVAL '30 seconds'
) ON CONFLICT (id) DO NOTHING;

-- Verify the table creation and data
SELECT 
  id,
  request,
  status,
  execution_summary,
  estimated_duration,
  actual_duration,
  created_at
FROM orchestration_workflows 
ORDER BY created_at DESC 
LIMIT 5;