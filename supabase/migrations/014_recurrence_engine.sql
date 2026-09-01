-- Migration 014: Recurrence Engine
-- Creates scheduled_task_instances and generate_task_instances RPC

BEGIN;

-- ============================================================
-- 1. SCHEDULED TASK INSTANCES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS scheduled_task_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES members(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
  completion_id UUID REFERENCES task_completions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, scheduled_date)
);

-- ============================================================
-- 2. RPC: Generate task instances for a date range
-- ============================================================

CREATE OR REPLACE FUNCTION generate_task_instances(
  p_family_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '7 days'
)
RETURNS INTEGER AS $$
DECLARE
  v_task RECORD;
  v_child RECORD;
  v_current_date DATE;
  v_count INTEGER := 0;
  v_day_of_week INTEGER;
  v_day_of_month INTEGER;
BEGIN
  -- Get all active tasks for this family
  FOR v_task IN 
    SELECT * FROM tasks 
    WHERE family_id = p_family_id 
      AND is_active = TRUE 
      AND is_deleted = FALSE
  LOOP
    -- Get children in this family
    FOR v_child IN
      SELECT id FROM members 
      WHERE family_id = p_family_id 
        AND role = 'child' 
        AND is_deleted = FALSE
    LOOP
      v_current_date := p_start_date;
      
      WHILE v_current_date <= p_end_date LOOP
        v_day_of_week := EXTRACT(DOW FROM v_current_date); -- 0=Sun
        v_day_of_month := EXTRACT(DAY FROM v_current_date);
        
        -- Check if task should be generated for this date
        IF (
          (v_task.frequency = 'daily') OR
          (v_task.frequency = 'weekly' AND v_day_of_week = 1) OR -- Monday
          (v_task.frequency = 'monthly' AND v_day_of_month = 1)
        ) THEN
          INSERT INTO scheduled_task_instances (task_id, family_id, assigned_to, scheduled_date)
          VALUES (v_task.id, p_family_id, v_child.id, v_current_date)
          ON CONFLICT (task_id, scheduled_date) DO NOTHING;
          
          v_count := v_count + 1;
        END IF;
        
        v_current_date := v_current_date + INTERVAL '1 day';
      END LOOP;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. RPC: Mark scheduled instance as completed
-- ============================================================

CREATE OR REPLACE FUNCTION complete_scheduled_instance(
  p_instance_id UUID,
  p_completion_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE scheduled_task_instances
  SET status = 'completed',
      completion_id = p_completion_id
  WHERE id = p_instance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. RLS for scheduled_task_instances
-- ============================================================

ALTER TABLE scheduled_task_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scheduled_task_instances_family" ON scheduled_task_instances;
CREATE POLICY "scheduled_task_instances_family" ON scheduled_task_instances
  FOR ALL USING (true);

-- ============================================================
-- 5. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_sti_family_date ON scheduled_task_instances(family_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_sti_task_date ON scheduled_task_instances(task_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_sti_assigned ON scheduled_task_instances(assigned_to, scheduled_date);

COMMIT;
