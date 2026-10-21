import { createClient } from "npm:@supabase/supabase-js@2";

type WebhookEvent = {
  table?: string;
  type?: string;
  actor_id?: string | null;
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown> | null;
  [key: string]: unknown;
};

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  sound: "default";
  priority: "high";
  channelId: "default";
  data: Record<string, string>;
};

const expoPushUrl = "https://exp.host/--/api/v2/push/send";
let supabaseClient: ReturnType<typeof createClient> | undefined;

function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase URL and service-role key are required.");
  }
  supabaseClient = createClient(supabaseUrl, serviceRoleKey);
  return supabaseClient;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function sendMessages(messages: ExpoMessage[]) {
  const supabase = getSupabase();
  const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN");

  for (let start = 0; start < messages.length; start += 100) {
    const batch = messages.slice(start, start + 100);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const response = await fetch(expoPushUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Expo Push Service returned ${response.status}: ${detail}`);
    }

    const result = (await response.json()) as {
      data?: Array<{ status?: string; details?: { error?: string } }>;
    };
    const invalidTokens: string[] = [];
    for (const [index, ticket] of (result.data ?? []).entries()) {
      if (ticket.status !== "error") continue;
      if (ticket.details?.error === "DeviceNotRegistered") {
        invalidTokens.push(batch[index].to);
      } else {
        console.error("Expo rejected a push notification.", ticket.details?.error ?? "Unknown error");
      }
    }
    for (const token of invalidTokens) {
      const { error } = await supabase
        .from("push_tokens")
        .delete()
        .eq("expo_push_token", token);
      if (error) console.error("Could not remove an expired push token.", error.message);
    }
  }
}

async function sendToUser(
  userId: string | null,
  notification: Omit<ExpoMessage, "to" | "sound" | "priority" | "channelId">,
) {
  if (!userId) return;
  const supabase = getSupabase();
  const { data: tokens, error } = await supabase
    .from("push_tokens")
    .select("expo_push_token")
    .eq("user_id", userId);
  if (error) throw new Error(`Could not load notification recipients: ${error.message}`);
  if (!tokens?.length) return;

  await sendMessages(
    tokens.map(({ expo_push_token: to }) => ({
      ...notification,
      to,
      sound: "default",
      priority: "high",
      channelId: "default",
    })),
  );
}

async function profileName(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load notification profile: ${error.message}`);
  return data?.display_name ?? "Someone";
}

async function bookTitle(bookId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("library_books")
    .select("title")
    .eq("id", bookId)
    .maybeSingle();
  if (error) throw new Error(`Could not load notification book: ${error.message}`);
  return data?.title ?? "a book";
}

function message(
  title: string,
  body: string,
  data: Record<string, string>,
): Omit<ExpoMessage, "to" | "sound" | "priority" | "channelId"> {
  return { title, body, data };
}

async function handleBorrowRequest(event: WebhookEvent) {
  const record = event.record;
  if (!record) return;
  const borrowerId = typeof record.borrower_id === "string" ? record.borrower_id : null;
  const lenderId = typeof record.lender_id === "string" ? record.lender_id : null;
  const requestId = typeof record.id === "string" ? record.id : null;
  const bookId = typeof record.book_id === "string" ? record.book_id : null;
  const status = typeof record.status === "string" ? record.status : "";
  if (!borrowerId || !lenderId || !requestId || !bookId) return;

  const actorId = typeof event.actor_id === "string" ? event.actor_id : null;
  const isInsert = event.type === "INSERT";
  const recipientId = isInsert
    ? lenderId
    : actorId === lenderId
      ? borrowerId
      : lenderId;
  const [actorName, title] = await Promise.all([
    profileName(actorId ?? (isInsert ? borrowerId : lenderId)),
    bookTitle(bookId),
  ]);

  let titleText = "Borrow request update";
  let body = `${actorName} updated the request for ${title}.`;
  if (isInsert) {
    titleText = "New borrow request";
    body = `${actorName} asked to borrow ${title}.`;
  } else if (status === "accepted") {
    titleText = "Request accepted";
    body = `${actorName} accepted your request for ${title}.`;
  } else if (status === "declined") {
    titleText = "Request declined";
    body = `${actorName} declined your request for ${title}.`;
  } else if (status === "lent") {
    titleText = "Book lent";
    body = `${actorName} marked ${title} as lent to you.`;
  } else if (status === "returned") {
    titleText = "Book returned";
    body = `${actorName} marked ${title} as returned.`;
  } else if (status === "cancelled") {
    titleText = "Request cancelled";
    body = `${actorName} cancelled the request for ${title}.`;
  }

  await sendToUser(
    recipientId,
    message(titleText, body, { requestId }),
  );
}

async function handleFriendRequest(event: WebhookEvent) {
  const record = event.record;
  if (!record) return;
  const senderId = typeof record.sender_id === "string" ? record.sender_id : null;
  const recipientId = typeof record.recipient_id === "string" ? record.recipient_id : null;
  if (!senderId || !recipientId) return;

  const actorId = typeof event.actor_id === "string" ? event.actor_id : null;
  const isInsert = event.type === "INSERT";
  const targetId = isInsert
    ? recipientId
    : actorId === senderId
      ? recipientId
      : senderId;
  const actorName = await profileName(actorId ?? senderId);
  const status = typeof record.status === "string" ? record.status : "pending";
  const routeUserId = targetId === senderId ? recipientId : senderId;
  const title =
    status === "accepted"
      ? "Friend request accepted"
      : status === "declined"
        ? "Friend request declined"
        : status === "cancelled"
          ? "Friend request cancelled"
          : "New friend request";
  const body =
    status === "accepted"
      ? `${actorName} accepted your friend request.`
      : status === "declined"
        ? `${actorName} declined your friend request.`
        : status === "cancelled"
          ? `${actorName} cancelled a friend request.`
          : `${actorName} sent you a friend request.`;

  await sendToUser(
    targetId,
    message(
      title,
      body,
      { userId: routeUserId },
    ),
  );
}

async function handleRequestMessage(event: WebhookEvent) {
  const record = event.record;
  if (!record) return;
  const requestId = typeof record.request_id === "string" ? record.request_id : null;
  const senderId = typeof record.sender_id === "string" ? record.sender_id : null;
  if (!requestId || !senderId) return;

  const supabase = getSupabase();
  const { data: request, error } = await supabase
    .from("borrow_requests")
    .select("borrower_id, lender_id, book_id")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw new Error(`Could not load request message context: ${error.message}`);
  if (!request) return;

  const recipientId = senderId === request.borrower_id ? request.lender_id : request.borrower_id;
  const [senderName, title] = await Promise.all([
    profileName(senderId),
    bookTitle(request.book_id),
  ]);
  await sendToUser(
    recipientId,
    message("New message", `${senderName} sent a message about ${title}.`, { requestId }),
  );
}

async function handleDueReminders() {
  const supabase = getSupabase();
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: requests, error } = await supabase
    .from("borrow_requests")
    .select("id, borrower_id, book_id")
    .eq("status", "lent")
    .eq("due_date", dueDate);
  if (error) throw new Error(`Could not load due requests: ${error.message}`);
  if (!requests?.length) return;

  for (const request of requests) {
    const title = await bookTitle(request.book_id);
    await sendToUser(
      request.borrower_id,
      message("Book due tomorrow", `Please remember to return ${title} tomorrow.`, {
        requestId: request.id,
      }),
    );
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const expectedSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!expectedSecret) {
    console.error("PUSH_WEBHOOK_SECRET is not configured.");
    return jsonResponse({ error: "Push webhook is not configured" }, 500);
  }
  if (request.headers.get("x-push-webhook-secret") !== expectedSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  if (!isRecord(payload)) return jsonResponse({ error: "Invalid webhook payload" }, 400);

  try {
    const event = payload as WebhookEvent;
    if (event.type === "DUE_REMINDER") {
      await handleDueReminders();
    } else if (event.table === "borrow_requests") {
      await handleBorrowRequest(event);
    } else if (event.table === "friend_requests") {
      await handleFriendRequest(event);
    } else if (event.table === "request_messages") {
      await handleRequestMessage(event);
    }
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Push notification dispatch failed.", error);
    return jsonResponse({ error: "Push notification dispatch failed" }, 500);
  }
});
