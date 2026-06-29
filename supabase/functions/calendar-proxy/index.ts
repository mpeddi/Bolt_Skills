import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function refreshAccessToken(clientId: string, refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json() as { access_token?: string; error?: string };
  return data.access_token ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { connector_id, action, params } = body;

    // exchange_code action does not require an existing connector
    if (action === "exchange_code") {
      const { code, code_verifier, client_id, redirect_uri } = params as {
        code: string;
        code_verifier: string;
        client_id: string;
        redirect_uri: string;
      };
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id,
          code_verifier,
          redirect_uri,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await res.json();
      return jsonResponse(tokenData);
    }

    const { data: connector, error: connectorError } = await supabase
      .from("user_connectors")
      .select("id, credentials, config")
      .eq("id", connector_id)
      .eq("connector_type", "google_calendar")
      .maybeSingle();

    if (connectorError || !connector) {
      return jsonResponse({ error: "Connector not found" }, 404);
    }

    const creds = connector.credentials as {
      client_id: string;
      refresh_token: string;
      access_token?: string;
    };

    // Always refresh to get a valid access token
    const accessToken = await refreshAccessToken(creds.client_id, creds.refresh_token);
    if (!accessToken) {
      // Mark connector as errored
      await supabase
        .from("user_connectors")
        .update({ status: "error" })
        .eq("id", connector_id);
      return jsonResponse({ error: "Failed to refresh Google access token. Please reconnect." }, 401);
    }

    const calHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    const baseUrl = "https://www.googleapis.com/calendar/v3";
    const calendarId = (connector.config as { calendar_id?: string }).calendar_id || "primary";

    let result: unknown;

    if (action === "list_calendars") {
      const res = await fetch(`${baseUrl}/users/me/calendarList`, { headers: calHeaders });
      result = await res.json();
    } else if (action === "get_events") {
      const daysAhead = params?.days_ahead || 7;
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + daysAhead * 86400000).toISOString();
      const maxResults = params?.maxResults || 20;
      const res = await fetch(
        `${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
        { headers: calHeaders }
      );
      result = await res.json();
    } else if (action === "create_event") {
      const res = await fetch(
        `${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          headers: calHeaders,
          body: JSON.stringify(params.event),
        }
      );
      result = await res.json();
    } else if (action === "delete_event") {
      const res = await fetch(
        `${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${params.event_id}`,
        { method: "DELETE", headers: calHeaders }
      );
      result = res.status === 204 ? { success: true } : await res.json();
    } else if (action === "test_connection") {
      const res = await fetch(`${baseUrl}/users/me/calendarList?maxResults=1`, {
        headers: calHeaders,
      });
      result = await res.json();
    } else {
      return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }

    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse({ error: message }, 500);
  }
});
