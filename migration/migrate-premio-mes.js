const fetch = require("node-fetch");

const FIREBASE_PROJECT = "gestao-de-tempo";
const FIREBASE_API_KEY = "AIzaSyCVJtHQ_nzIWGKoMYVCk81Dz67L1zvTvuA";
const SUPABASE_URL = "https://zwfvrmqffxcqurxpfewi.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3ZnZybXFmZnhjcXVyeHBmZXdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ0MzAzOSwiZXhwIjoyMDkyMDE5MDM5fQ.0f_RjIH4-VXgPwDUicIg4_ns37gmHZFY9fR1vt95s1Q";

const HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey: SUPABASE_SERVICE_KEY,
};

function extractValue(field) {
  if (!field) return null;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return parseInt(field.integerValue);
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.timestampValue !== undefined) return field.timestampValue;
  return null;
}

async function main() {
  console.log("📥 Buscando premioMes do Firestore...");
  let allDocs = [], pageToken = null;

  do {
    let url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/premioMes?key=${FIREBASE_API_KEY}&pageSize=300`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.documents) allDocs = allDocs.concat(data.documents);
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  console.log(`✅ ${allDocs.length} prêmios encontrados\n`);

  let ok = 0, skip = 0, fail = 0;

  for (const doc of allDocs) {
    const id = doc.name.split("/").pop();
    const f = doc.fields || {};

    const nome = extractValue(f.nome) || "Sem nome";
    const mes = extractValue(f.mes);
    const ano = extractValue(f.ano);
    const descricao = extractValue(f.descricao) || null;
    const valor = extractValue(f.valor) || null;
    const rawImagem = extractValue(f.imagem) || null;
    const imagem = rawImagem && !rawImagem.startsWith("data:") ? rawImagem : null;
    const atualizadoEm = extractValue(f.atualizadoEm) || null;

    if (!mes || !ano) {
      console.log(`  ⚠️  Pulando ${id} sem mes/ano`);
      skip++;
      continue;
    }

    process.stdout.write(`  → ${String(mes).padStart(2,"0")}/${ano}: "${nome.substring(0,45)}" ... `);

    const payload = { id, mes, ano, nome, descricao, valor, imagem, atualizado_em: atualizadoEm };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/premio_mes`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "return=minimal,resolution=ignore-duplicates" },
      body: JSON.stringify(payload),
    });

    if (res.ok || res.status === 201) { console.log("✅"); ok++; }
    else if (res.status === 409) { console.log("⏭️  já existe"); skip++; }
    else { console.log(`❌ ${await res.text()}`); fail++; }
  }

  console.log(`\n📊 Resultado: ${ok} inseridos | ${skip} pulados | ${fail} erros`);
}

main().catch(console.error);
