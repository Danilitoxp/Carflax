import { createClient } from "@supabase/supabase-js";

// Configuração do Supabase ANTIGO (Coletor)
const OLD_URL = "https://htcyaamvyjghjkzrzhvk.supabase.co";
const OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Y3lhYW12eWpnaGprenJ6aHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTQ2MDEsImV4cCI6MjA4OTMzMDYwMX0.JiM9lmaCYJx4-PmNS88McmvWr3nQZfv5S9CYZjF-BGc";
const oldSupabase = createClient(OLD_URL, OLD_KEY);

// Configuração do Supabase NOVO (Carflax)
const NEW_URL = "https://zwfvrmqffxcqurxpfewi.supabase.co";
const NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3ZnZybXFmZnhjcXVyeHBmZXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NDMwMzksImV4cCI6MjA5MjAxOTAzOX0.6Q02L0XYE7xWtn0AcCwN2KDTvRaYQgGwoTPLblR-VgE";
const newSupabase = createClient(NEW_URL, NEW_KEY);

async function migrate() {
  console.log("🚀 Iniciando migração de dados...");

  // 1. Migrar Armazenamento
  console.log("📦 Migrando Armazenamentos...");
  const { data: storageData, error: storageError } = await oldSupabase.from('armazenamento_pendente').select('*');
  if (storageError) {
    console.error("❌ Erro ao buscar dados antigos de armazenamento:", storageError);
  } else if (storageData && storageData.length > 0) {
    const { error: insertError } = await newSupabase.from('coletor_armazenamento').upsert(storageData);
    if (insertError) console.error("❌ Erro ao inserir no novo banco (armazenamento):", insertError);
    else console.log(`✅ ${storageData.length} registros de armazenamento migrados.`);
  } else {
    console.log("ℹ️ Nenhum dado de armazenamento para migrar.");
  }

  // 2. Migrar Sessões de Conferência
  console.log("🤝 Migrando Sessões de Conferência...");
  const { data: sessionData, error: sessionError } = await oldSupabase.from('conferencia_session').select('*');
  if (sessionError) {
    console.error("❌ Erro ao buscar dados antigos de sessão:", sessionError);
  } else if (sessionData && sessionData.length > 0) {
    const { error: insertError } = await newSupabase.from('coletor_conferencia').upsert(sessionData);
    if (insertError) console.error("❌ Erro ao inserir no novo banco (conferência):", insertError);
    else console.log(`✅ ${sessionData.length} sessões de conferência migradas.`);
  } else {
    console.log("ℹ️ Nenhuma sessão ativa para migrar.");
  }

  console.log("🏁 Migração concluída!");
}

migrate();
