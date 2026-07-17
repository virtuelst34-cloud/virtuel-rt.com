import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface RateLimitRequest {
  action: "message" | "reaction" | "dm" | "salon_create";
  userId: string;
}

interface RateLimitResponse {
  success: boolean;
  remaining?: number;
  resetAt?: number;
  error?: string;
}

const RATE_LIMITS = {
  message: 30,
  reaction: 60,
  dm: 10,
  salon_create: 2,
} as const;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) rateLimitStore.delete(key);
  }
}

function checkRateLimit(userId: string, action: keyof typeof RATE_LIMITS): RateLimitResponse {
  cleanupExpiredEntries();

  const key = `${userId}:${action}`;
  const now = Date.now();
  const windowMs = 60_000;
  const limit = RATE_LIMITS[action];

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      error: `Rate limit exceeded for ${action}. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, userId }: RateLimitRequest = await req.json();

    if (!action || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: action and userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!(action in RATE_LIMITS)) {
      return new Response(
        JSON.stringify({ error: "Invalid action type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = checkRateLimit(userId, action);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-RateLimit-Limit": RATE_LIMITS[action].toString(),
        "X-RateLimit-Remaining": String(result.remaining ?? 0),
        "X-RateLimit-Reset": String(result.resetAt ?? 0),
      },
    });
  } catch (error) {
    console.error("Rate limit error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
