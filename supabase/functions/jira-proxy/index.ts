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

    const { data: connector, error: connectorError } = await supabase
      .from("user_connectors")
      .select("credentials, config")
      .eq("id", connector_id)
      .eq("connector_type", "jira")
      .maybeSingle();

    if (connectorError || !connector) {
      return jsonResponse({ error: "Connector not found" }, 404);
    }

    const { email, api_token, domain } = connector.credentials as {
      email: string;
      api_token: string;
      domain: string;
    };
    const basicAuth = btoa(`${email}:${api_token}`);
    const baseUrl = `https://${domain}.atlassian.net`;
    const headers = {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    let result: unknown;

    if (action === "test_connection") {
      const res = await fetch(`${baseUrl}/rest/api/3/myself`, { headers });
      result = await res.json();
    } else if (action === "get_issues") {
      const jql =
        params?.jql ||
        'assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC';
      const maxResults = params?.maxResults || 25;
      const res = await fetch(
        `${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,status,priority,issuetype,project,updated,assignee,description`,
        { headers }
      );
      result = await res.json();
    } else if (action === "get_projects") {
      const res = await fetch(`${baseUrl}/rest/api/3/project?maxResults=50`, { headers });
      result = await res.json();
    } else if (action === "get_issue_types") {
      const projectKey = params?.projectKey;
      const url = projectKey
        ? `${baseUrl}/rest/api/3/issuetype/project?projectId=${projectKey}`
        : `${baseUrl}/rest/api/3/issuetype`;
      const res = await fetch(url, { headers });
      result = await res.json();
    } else if (action === "create_issue") {
      const res = await fetch(`${baseUrl}/rest/api/3/issue`, {
        method: "POST",
        headers,
        body: JSON.stringify(params.issue),
      });
      result = await res.json();
    } else if (action === "get_transitions") {
      const res = await fetch(
        `${baseUrl}/rest/api/3/issue/${params.issueKey}/transitions`,
        { headers }
      );
      result = await res.json();
    } else if (action === "transition_issue") {
      const res = await fetch(
        `${baseUrl}/rest/api/3/issue/${params.issueKey}/transitions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ transition: { id: params.transitionId } }),
        }
      );
      result = res.status === 204 ? { success: true } : await res.json();
    } else if (action === "add_comment") {
      const res = await fetch(
        `${baseUrl}/rest/api/3/issue/${params.issueKey}/comment`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            body: {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: params.comment }],
                },
              ],
            },
          }),
        }
      );
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
