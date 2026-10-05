const SUPABASE_URL = process.env.SUPABASE_URL || "https://supabase.gafcore.com";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheGlkcml2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDc5MzAwNCwiZXhwIjoyMTA2MTUzMDA0fQ.zM_dummy"; // fallback

// Let's test with the keys in .env
async function main() {
  console.log("Comprobando buckets en:", SUPABASE_URL);

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  const buckets = await res.json();
  console.log("Buckets existentes:", buckets);

  const bucketName = "publivende-media";
  const exists = Array.isArray(buckets) && buckets.some((b) => b.id === bucketName || b.name === bucketName);

  if (!exists) {
    console.log(`Creando bucket público '${bucketName}'...`);
    const createRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: bucketName,
        name: bucketName,
        public: true,
        file_size_limit: 104857600, // 100MB
        allowed_mime_types: ["image/*", "video/*"],
      }),
    });

    const createJson = await createRes.json();
    console.log("Resultado creación bucket:", createRes.status, createJson);
  } else {
    console.log(`Bucket '${bucketName}' ya existe.`);
  }

  // Probar subida de un archivo de prueba
  console.log("Subiendo archivo de prueba al bucket...");
  const testFileContent = Buffer.from("publivende test file " + Date.now());
  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucketName}/test-probe.txt`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "text/plain",
      "x-upsert": "true",
    },
    body: testFileContent,
  });

  const uploadJson = await uploadRes.json().catch(() => ({}));
  console.log("Upload status:", uploadRes.status, uploadJson);

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/test-probe.txt`;
  console.log("Public URL:", publicUrl);

  const verifyPublic = await fetch(publicUrl);
  console.log("Verificación URL pública:", verifyPublic.status, await verifyPublic.text());
}

main().catch((err) => {
  console.error("Error en storage setup:", err);
  process.exit(1);
});
