import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase environment variables!");
}

export const supabase = createClient(SUPABASE_URL || "", SUPABASE_ANON_KEY || "");

// Limpa automaticamente sessões com refresh token inválido/expirado.
// Sem isso, o Supabase fica tentando renovar o token em loop, gerando erros repetidos.
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "TOKEN_REFRESHED" && !session) {
    supabase.auth.signOut();
  }
});

// Captura erros globais de token inválido e limpa a sessão
supabase.auth.getSession().then(({ error }) => {
  if (error?.message?.includes("Refresh Token Not Found") || error?.message?.includes("Invalid Refresh Token")) {
    console.warn("[Auth] Token de sessão inválido detectado. Limpando sessão...");
    supabase.auth.signOut();
  }
});

