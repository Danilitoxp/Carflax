// @ts-expect-error: Deno module resolution
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

Deno.serve(async (req: Request) => {
  // Responde ao preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  try {
    const { email, name, hub_user_id } = await req.json();

    if (!email || !name) {
      return new Response(JSON.stringify({ error: 'email e name são obrigatórios' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verifica se já existe no Auth
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 500,
        headers: CORS_HEADERS,
      });
    }

    const alreadyExists = existingUsers.users.some(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (alreadyExists) {
      return new Response(JSON.stringify({ ok: true, skipped: true, message: 'Usuário já existe no Auth' }), {
        status: 200,
        headers: CORS_HEADERS,
      });
    }

    // Cria o usuário no Auth com senha temporária e email já confirmado
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: '@carflax@',
      email_confirm: true,
      user_metadata: {
        name,
        hub_user_id: hub_user_id || null,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, skipped: false, auth_id: authData.user.id }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
});
