
/*
# Enterprise Dashboard Schema

## Overview
Creates the core tables for the enterprise personal dashboard system.
Users can connect third-party SaaS services (Jira, Slack, Google Calendar)
and build a personalized widget-based dashboard.

## New Tables

### user_connectors
Stores each user's connected service credentials and configuration.
- id (uuid, primary key)
- user_id (uuid, FK to auth.users, defaults to auth.uid())
- connector_type (text): one of 'jira', 'slack', 'google_calendar'
- display_name (text): user-facing label for this connection
- config (jsonb): non-sensitive configuration (e.g. Jira domain)
- credentials (jsonb): sensitive data (tokens, API keys) — RLS protected, only owner can read
- status (text): 'active' | 'error' | 'disconnected'
- last_synced_at (timestamptz): when the connector was last successfully used
- created_at / updated_at (timestamptz): standard timestamps

### dashboard_widgets
Stores each user's widget instances on their dashboard.
- id (uuid, primary key)
- user_id (uuid, FK to auth.users, defaults to auth.uid())
- connector_id (uuid, FK to user_connectors): which connected service this widget uses
- widget_type (text): e.g. 'jira_my_issues', 'slack_channel', 'calendar_agenda'
- title (text): display name shown on the widget card
- config (jsonb): widget-specific settings (e.g. Jira project key, Slack channel ID)
- position (integer): ordering index in the dashboard grid
- size (text): 'small' | 'medium' | 'large'
- created_at / updated_at (timestamptz): standard timestamps

## Security
- RLS enabled on both tables
- All policies scoped to authenticated users owning their own rows (auth.uid() = user_id)
- Credentials are invisible to other users at the database layer

## Notes
- user_id defaults to auth.uid() so inserts work without explicitly passing user_id
- Deleting a connector cascades to remove all its associated widgets
*/

-- user_connectors: stores per-user SaaS service credentials
CREATE TABLE IF NOT EXISTS user_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_type text NOT NULL CHECK (connector_type IN ('jira', 'slack', 'google_calendar')),
  display_name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  credentials jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected')),
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_connectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_connectors" ON user_connectors;
CREATE POLICY "select_own_connectors" ON user_connectors
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_connectors" ON user_connectors;
CREATE POLICY "insert_own_connectors" ON user_connectors
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_connectors" ON user_connectors;
CREATE POLICY "update_own_connectors" ON user_connectors
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_connectors" ON user_connectors;
CREATE POLICY "delete_own_connectors" ON user_connectors
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- dashboard_widgets: user's widget instances on their dashboard
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL REFERENCES user_connectors(id) ON DELETE CASCADE,
  widget_type text NOT NULL,
  title text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  position integer NOT NULL DEFAULT 0,
  size text NOT NULL DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_widgets" ON dashboard_widgets;
CREATE POLICY "select_own_widgets" ON dashboard_widgets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_widgets" ON dashboard_widgets;
CREATE POLICY "insert_own_widgets" ON dashboard_widgets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_widgets" ON dashboard_widgets;
CREATE POLICY "update_own_widgets" ON dashboard_widgets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_widgets" ON dashboard_widgets;
CREATE POLICY "delete_own_widgets" ON dashboard_widgets
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_connectors_user_id ON user_connectors(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user_id ON dashboard_widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_connector_id ON dashboard_widgets(connector_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_position ON dashboard_widgets(user_id, position);

-- updated_at auto-update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_user_connectors_updated_at ON user_connectors;
CREATE TRIGGER update_user_connectors_updated_at
  BEFORE UPDATE ON user_connectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dashboard_widgets_updated_at ON dashboard_widgets;
CREATE TRIGGER update_dashboard_widgets_updated_at
  BEFORE UPDATE ON dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
