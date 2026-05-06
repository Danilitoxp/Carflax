// @ts-expect-error: Deno module resolution
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-expect-error: npm compat
import webpush from 'npm:web-push';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:marketing@carflax.com.br';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json();

    // Suporta payload direto ou com envelope { instance, data }
    const instance = payload.instance as string | undefined;
    const expectedInstance = Deno.env.get('EVO_INSTANCE') || '';
    if (instance && expectedInstance && instance !== expectedInstance) {
      return new Response('Ignored (different instance)', { status: 200 });
    }

    const raw = payload.data ?? payload;
    const messages: Record<string, unknown>[] = Array.isArray(raw) ? raw : [raw];

    for (const msg of messages) {
      const key = msg.key as Record<string, unknown> | undefined;
      if (!key || key.fromMe) continue;
      if (!String(key.remoteJid ?? '').endsWith('@s.whatsapp.net')) continue;

      const senderName = String(msg.pushName || String(key.remoteJid ?? '').split('@')[0]);
      const msgContent = msg.message as Record<string, unknown> | undefined;
      const text = String(
        msgContent?.conversation ||
        (msgContent?.extendedTextMessage as Record<string, unknown> | undefined)?.text ||
        '📎 Mídia recebida'
      );

      const notification = JSON.stringify({
        title: `💬 ${senderName}`,
        body: text,
        icon: '/favicon.svg',
        tag: `wpp-${String(key.remoteJid)}`,
        section: 'Marketing',
      });

      // Busca todas as subscrições ativas
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth');

      if (error || !subscriptions) continue;

      // Envia push para cada assinante
      const sends = subscriptions.map((sub: PushSubscription) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notification
        ).catch(() => null) // ignora subscrições expiradas
      );

      await Promise.all(sends);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
