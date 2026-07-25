import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Edge Function : traitement de la file d'alertes email / SMS.
 *
 * Secrets Supabase (Dashboard → Edge Functions → Secrets) :
 *   RESEND_API_KEY          — envoi email via Resend
 *   RESEND_FROM_EMAIL       — ex. alerts@virtuel-rt.com
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM_NUMBER      — numéro E.164 Twilio
 *
 * Sans provider : les items restent en status provider_missing (visible dans l'admin).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ProviderStatus = Record<string, string>;

function getProviderStatus(): ProviderStatus {
  const resend = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");

  return {
    email: resend && from ? "configured" : "provider_missing",
    sms: twilioSid && twilioToken && twilioFrom ? "configured" : "provider_missing",
    resend_from: from ? "set" : "missing",
    twilio_from: twilioFrom ? "set" : "missing",
  };
}

async function sendEmail(to: string, subject: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  if (!apiKey || !from) {
    return { ok: false, error: "RESEND_API_KEY ou RESEND_FROM_EMAIL manquant" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: subject || "Alerte modération — Virtuel-RT",
      text: body,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${text}` };
  }
  return { ok: true };
}

async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!sid || !token || !from) {
    return { ok: false, error: "Identifiants Twilio manquants" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams({
    To: to,
    From: from,
    Body: body.slice(0, 320),
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${sid}:${token}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Twilio ${res.status}: ${text}` };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const action = body?.action || "process_queue";
    const providers = getProviderStatus();

    if (action === "provider_status") {
      return new Response(JSON.stringify({ providerStatus: providers }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // process_queue
    const { data: pending, error } = await admin
      .from("moderation_alert_queue")
      .select("*")
      .eq("status", "pending")
      .in("channel", ["email", "sms"])
      .order("created_at", { ascending: true })
      .limit(40);

    if (error) throw error;

    let processed = 0;
    for (const item of pending || []) {
      await admin
        .from("moderation_alert_queue")
        .update({ status: "processing", attempts: (item.attempts || 0) + 1 })
        .eq("id", item.id);

      if (item.channel === "email") {
        if (providers.email !== "configured") {
          await admin
            .from("moderation_alert_queue")
            .update({
              status: "provider_missing",
              error_message: "RESEND_API_KEY / RESEND_FROM_EMAIL non configurés",
              processed_at: new Date().toISOString(),
            })
            .eq("id", item.id);
          processed++;
          continue;
        }
        if (!item.recipient_email) {
          await admin
            .from("moderation_alert_queue")
            .update({
              status: "skipped",
              error_message: "Email destinataire manquant",
              processed_at: new Date().toISOString(),
            })
            .eq("id", item.id);
          processed++;
          continue;
        }
        const result = await sendEmail(item.recipient_email, item.subject || "", item.body);
        await admin
          .from("moderation_alert_queue")
          .update({
            status: result.ok ? "sent" : "failed",
            error_message: result.error || null,
            processed_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        processed++;
      }

      if (item.channel === "sms") {
        if (providers.sms !== "configured") {
          await admin
            .from("moderation_alert_queue")
            .update({
              status: "provider_missing",
              error_message: "TWILIO_ACCOUNT_SID / AUTH_TOKEN / FROM_NUMBER non configurés",
              processed_at: new Date().toISOString(),
            })
            .eq("id", item.id);
          processed++;
          continue;
        }
        if (!item.recipient_phone) {
          await admin
            .from("moderation_alert_queue")
            .update({
              status: "skipped",
              error_message: "Téléphone destinataire manquant",
              processed_at: new Date().toISOString(),
            })
            .eq("id", item.id);
          processed++;
          continue;
        }
        const result = await sendSms(item.recipient_phone, item.body);
        await admin
          .from("moderation_alert_queue")
          .update({
            status: result.ok ? "sent" : "failed",
            error_message: result.error || null,
            processed_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        processed++;
      }
    }

    return new Response(
      JSON.stringify({ processed, providerStatus: providers }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
