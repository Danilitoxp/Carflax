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

function mapEventType(type) {
  const map = {
    birthday: "birthday",
    star: "star",
    education: "education",
    video: "video",
    treinamento: "education",
    campanha: "star",
    Dia_Especial: "birthday",
    dia_especial: "birthday",
    evento: "video",
    Produtos: "video",
    produtos: "video",
  };
  return map[type] || "video";
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
  console.log("📥 Buscando eventos do Firestore...");
  const docs = await fetchFirestoreCollection("events_shared");
  console.log(`✅ ${docs.length} eventos encontrados\n`);

  let ok = 0, skip = 0, fail = 0;

  for (const doc of docs) {
    const firebaseId = doc.name.split("/").pop();
    const f = doc.fields || {};

    const title = extractValue(f.title) || "Sem título";
    const dateStr = extractValue(f.date) || null;
    const type = extractValue(f.type) || "video";
    const description = extractValue(f.description) || null;
    const color = extractValue(f.color) || null;
    const icon = extractValue(f.icon) || null;
    const createdBy = extractValue(f.createdBy) || null;
    const members = extractValue(f.members) || [];

    if (!dateStr) {
      console.log(`  ⚠️  Pulando evento sem data (id: ${firebaseId})`);
      skip++;
      continue;
    }

    const [yearStr, monthStr, dayStr] = dateStr.split("-");
    const day = parseInt(dayStr);
    const month = parseInt(monthStr); // 1-indexed (January=1)
    const year = parseInt(yearStr);

    process.stdout.write(`  → "${title.substring(0, 40)}" (${dateStr}) ... `);

    const payload = {
      firebase_id: firebaseId,
      title,
      day,
      month,
      year,
      type: mapEventType(type),
      description,
      created_at: doc.createTime || new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/eventos_calendario`, {
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

  console.log(`\n📊 Resultado: ${ok} inseridos | ${skip} pulados | ${fail} erros`);
}

main().catch(console.error);
