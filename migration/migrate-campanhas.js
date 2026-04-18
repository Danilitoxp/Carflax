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
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.integerValue !== undefined) return parseInt(field.integerValue);
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.timestampValue !== undefined) return field.timestampValue;
  if (field.arrayValue !== undefined) return (field.arrayValue.values || []).map(extractValue);
  if (field.mapValue !== undefined) {
    const obj = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) obj[k] = extractValue(v);
    return obj;
  }
  return null;
}

async function fetchFirestoreCollection(collection) {
  let allDocs = [];
  let pageToken = null;

  do {
    let url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${collection}?key=${FIREBASE_API_KEY}&pageSize=300`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`);
    const data = await res.json();

    if (data.documents) allDocs = allDocs.concat(data.documents);
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return allDocs;
}

async function main() {
  console.log("📥 Buscando campanhas do Firestore...");
  const docs = await fetchFirestoreCollection("campanhas");
  console.log(`✅ ${docs.length} campanhas encontradas\n`);

  let ok = 0, skip = 0, fail = 0;

  for (const doc of docs) {
    const firebaseId = doc.name.split("/").pop();
    const f = doc.fields || {};

    const nome = extractValue(f.nome) || extractValue(f.name) || "Sem nome";
    const fornecedor = extractValue(f.fornecedor) || null;
    const periodoInicio = extractValue(f.periodoInicio) || null;
    const periodoFim = extractValue(f.periodoFim) || null;
    const rawImagem = extractValue(f.imagem) || null;
    const logo = rawImagem && !rawImagem.startsWith("data:") ? rawImagem : null;
    const updatedAt = extractValue(f.updatedAt) || null;

    process.stdout.write(`  → "${nome.substring(0, 40)}" (${fornecedor || "?"}) ... `);

    const payload = {
      firebase_id: firebaseId,
      name: nome,
      fornecedor,
      date: periodoInicio || null,
      periodo_fim: periodoFim || null,
      logo,
      type: "highlight",
      status: "ativa",
      updated_at: updatedAt || new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/campanhas`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "return=minimal,resolution=ignore-duplicates" },
      body: JSON.stringify(payload),
    });

    if (res.ok || res.status === 201) {
      console.log("✅");
      ok++;
    } else if (res.status === 409) {
      console.log("⏭️  já existe");
      skip++;
    } else {
      const err = await res.text();
      console.log(`❌ ${err}`);
      fail++;
    }
  }

  console.log(`\n📊 Resultado: ${ok} inseridas | ${skip} puladas | ${fail} erros`);
}

main().catch(console.error);
