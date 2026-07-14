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
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'email é obrigatório' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Busca o auth_id pelo email
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 500,
        headers: CORS_HEADERS,
      });
    }

    const authUser = listData.users.find(
      (u: { email?: string; id: string }) => u.email?.toLowerCase() === normalizedEmail
    );

    if (!authUser) {
      // Não existe no Auth — ok, nada a fazer
      return new Response(
        JSON.stringify({ ok: true, skipped: true, message: 'Usuário não encontrado no Auth' }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Exclui do Auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(authUser.id);
    if (deleteError) {
      // 409 Conflict = usuário já foi removido / não existe mais — tratar como sucesso
      const isAlreadyGone =
        deleteError.message?.toLowerCase().includes('not found') ||
        deleteError.message?.toLowerCase().includes('conflict') ||
        (deleteError as unknown as { status?: number }).status === 409;

      if (isAlreadyGone) {
        return new Response(
          JSON.stringify({ ok: true, skipped: true, message: 'Usuário já removido do Auth' }),
          { status: 200, headers: CORS_HEADERS }
        );
      }

      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, skipped: false, deleted_auth_id: authUser.id }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
});
