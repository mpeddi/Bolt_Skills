export type ConnectorType = 'jira' | 'slack' | 'google_calendar';
export type ConnectorStatus = 'active' | 'error' | 'disconnected';
export type WidgetSize = 'small' | 'medium' | 'large';

export interface UserConnector {
  id: string;
  user_id: string;
  connector_type: ConnectorType;
  display_name: string;
  config: Record<string, unknown>;
  credentials: Record<string, unknown>;
  status: ConnectorStatus;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  user_id: string;
  connector_id: string;
  widget_type: WidgetType;
  title: string;
  config: Record<string, unknown>;
  position: number;
  size: WidgetSize;
  created_at: string;
  updated_at: string;
  connector?: UserConnector;
}

export type WidgetType = 'jira_my_issues' | 'slack_channel' | 'calendar_agenda';

export interface WidgetDefinition {
  type: WidgetType;
  connector_type: ConnectorType;
  name: string;
  description: string;
  default_title: string;
  default_size: WidgetSize;
  requires_config: boolean;
}

export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  {
    type: 'jira_my_issues',
    connector_type: 'jira',
    name: 'My Jira Issues',
    description: 'View and manage issues assigned to you. Create new issues, update status, and add comments.',
    default_title: 'My Issues',
    default_size: 'large',
    requires_config: false,
  },
  {
    type: 'slack_channel',
    connector_type: 'slack',
    name: 'Slack Channel',
    description: 'Read messages and post to a Slack channel without leaving your dashboard.',
    default_title: 'Slack',
    default_size: 'medium',
    requires_config: true,
  },
  {
    type: 'calendar_agenda',
    connector_type: 'google_calendar',
    name: 'Calendar Agenda',
    description: 'See upcoming events and create new ones directly from your dashboard.',
    default_title: 'My Calendar',
    default_size: 'medium',
    requires_config: false,
  },
];

export const CONNECTOR_META: Record<ConnectorType, { name: string; color: string; bg: string }> = {
  jira: { name: 'Jira', color: '#0052CC', bg: '#E6F0FF' },
  slack: { name: 'Slack', color: '#4A154B', bg: '#F4EFF4' },
  google_calendar: { name: 'Google Calendar', color: '#1a73e8', bg: '#E8F0FE' },
};

// Jira API types
export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: { name: string; statusCategory: { colorName: string } };
    priority: { name: string; iconUrl: string } | null;
    issuetype: { name: string; iconUrl: string };
    project: { key: string; name: string };
    updated: string;
    assignee: { displayName: string } | null;
  };
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

// Slack API types
export interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
  num_members?: number;
}

export interface SlackMessage {
  ts: string;
  user: string;
  user_name: string;
  text: string;
  type: string;
}

// Calendar API types
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  htmlLink: string;
  attendees?: Array<{ email: string; responseStatus: string }>;
  location?: string;
}
