-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule weekly grace shield reset (every Sunday at 00:00 UTC)
SELECT cron.schedule(
  'reset-weekly-grace-shields',
  '0 0 * * 0',
  'SELECT reset_weekly_grace_shields()'
);

-- Verify the job was created
SELECT * FROM cron.job WHERE jobname = 'reset-weekly-grace-shields';
