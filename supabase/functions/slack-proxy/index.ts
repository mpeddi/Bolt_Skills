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
      .eq("connector_type", "slack")
      .maybeSingle();

    if (connectorError || !connector) {
      return jsonResponse({ error: "Connector not found" }, 404);
    }

    const { bot_token } = connector.credentials as { bot_token: string };
    const headers = {
      Authorization: `Bearer ${bot_token}`,
      "Content-Type": "application/json",
    };

    let result: unknown;

    if (action === "test_connection") {
      const res = await fetch("https://slack.com/api/auth.test", { headers });
      result = await res.json();
    } else if (action === "list_channels") {
      const limit = params?.limit || 100;
      const res = await fetch(
        `https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=${limit}&exclude_archived=true`,
        { headers }
      );
      result = await res.json();
    } else if (action === "get_messages") {
      const { channel_id, limit = 30 } = params as {
        channel_id: string;
        limit?: number;
      };
      const res = await fetch(
        `https://slack.com/api/conversations.history?channel=${channel_id}&limit=${limit}`,
        { headers }
      );
      const data = await res.json() as { ok: boolean; messages?: unknown[]; error?: string };
      if (!data.ok) {
        result = data;
      } else {
        // Resolve user display names for messages
        const messages = (data.messages || []) as Array<{
          user?: string;
          username?: string;
          bot_id?: string;
          [key: string]: unknown;
        }>;
        const userIds = [...new Set(
          messages.map((m) => m.user).filter(Boolean) as string[]
        )];
        const userMap: Record<string, string> = {};
        await Promise.all(
          userIds.map(async (uid) => {
            const uRes = await fetch(
              `https://slack.com/api/users.info?user=${uid}`,
              { headers }
            );
            const uData = await uRes.json() as {
              ok: boolean;
              user?: { real_name?: string; name?: string };
            };
            if (uData.ok && uData.user) {
              userMap[uid] = uData.user.real_name || uData.user.name || uid;
            }
          })
        );
        result = {
          ...data,
          messages: messages.map((m) => ({
            ...m,
            user_name: m.user ? (userMap[m.user] || m.user) : (m.username || "Bot"),
          })),
        };
      }
    } else if (action === "post_message") {
      const { channel_id, text } = params as {
        channel_id: string;
        text: string;
      };
      const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers,
        body: JSON.stringify({ channel: channel_id, text }),
      });
      result = await res.json();
    } else if (action === "get_channel_info") {
      const res = await fetch(
        `https://slack.com/api/conversations.info?channel=${params.channel_id}`,
        { headers }
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
