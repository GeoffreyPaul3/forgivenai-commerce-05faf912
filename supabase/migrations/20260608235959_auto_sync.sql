-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Note: In a production environment, you should replace the URL and Anon Key with the respective values.
-- The following command schedules the edge function to be invoked every 5 minutes.
-- Please run this directly in your Supabase SQL Editor if it fails to execute via CLI.

SELECT cron.schedule(
  'sync-catalog-every-5-minutes',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
      url:='https://wzncegnkhybtmybqftbv.supabase.co/functions/v1/sync-catalog',
      headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bmNlZ25raHlidG15YnFmdGJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDkzNzcsImV4cCI6MjA5MTcyNTM3N30.tiOdT6E7dYNvx0Tln0N-S_4Yhc6NQKbjPutQCa2tBbQ'
      )
  );
  $$
);
