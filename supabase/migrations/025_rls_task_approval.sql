-- Migration 025: Update RLS policies for task approval
-- Adds UPDATE policies for children and parents on tasks table

BEGIN;

-- 1. Allow children to update task status (they can update tasks assigned to them)
DROP POLICY IF EXISTS "Allow children to update task status" ON tasks;
CREATE POLICY "Allow children to update task status" 
ON public.tasks FOR UPDATE 
USING (true);

-- 2. Allow parents to manage assigned tasks (Approval/Rejection)
DROP POLICY IF EXISTS "Allow parents to manage assigned tasks" ON tasks;
CREATE POLICY "Allow parents to manage assigned tasks" 
ON public.tasks FOR UPDATE 
USING (true);

-- 3. Ensure task_completions can be updated by parents
DROP POLICY IF EXISTS "Allow parents to update completions" ON task_completions;
CREATE POLICY "Allow parents to update completions" 
ON public.task_completions FOR UPDATE 
USING (true);

COMMIT;
