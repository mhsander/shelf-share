import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function jsonResponse(body: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authorization = request.headers.get("Authorization");
  const accessToken = authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!accessToken) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase URL and service-role key are required.");
    return jsonResponse({ error: "Account deletion is not configured." }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userResult, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userResult.user) {
    return jsonResponse({ error: "Your session is invalid or expired. Sign in and try again." }, 401);
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("avatar_path")
    .eq("id", userResult.user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Could not load the account avatar path.", profileError.message);
    return jsonResponse({ error: "Your account could not be deleted. Please try again." }, 500);
  }
  if (profile?.avatar_path) {
    const { error: avatarError } = await admin.storage
      .from("avatars")
      .remove([profile.avatar_path]);
    if (avatarError) {
      console.error("Could not delete the account avatar.", avatarError.message);
      return jsonResponse({ error: "Your profile photo could not be deleted. Please try again." }, 500);
    }
  }

  const { error: deletionError } = await admin.auth.admin.deleteUser(userResult.user.id);
  if (deletionError) {
    console.error("Could not delete the authenticated account.", deletionError.message);
    return jsonResponse({ error: "Your account could not be deleted. Please try again." }, 500);
  }

  return jsonResponse({ message: "Account deleted." });
});
