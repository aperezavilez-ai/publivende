import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) process.exit(1);

const sql = postgres(url, { max: 1 });
const userId = "eda8fded-4e65-46fd-822c-a917ec79e9a5";

async function main() {
  const [acc] = await sql`
    SELECT access_token, external_account_id, nombre_cuenta
    FROM oauth_accounts WHERE user_id = ${userId} AND red = 'facebook'
  `;
  if (!acc) {
    console.log("No FB account");
    return;
  }

  console.log("Connected page:", acc.nombre_cuenta, acc.external_account_id);

  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,tasks&limit=50&access_token=${encodeURIComponent(acc.access_token)}`,
  );
  const pagesJson = (await pagesRes.json()) as {
    data?: Array<{ id: string; name: string; tasks?: string[] }>;
    error?: { message?: string; code?: number };
  };
  console.log("PAGES:", JSON.stringify(pagesJson, null, 2));

  const groupsRes = await fetch(
    `https://graph.facebook.com/v21.0/me/groups?fields=id,name,member_count,administrator&limit=20&access_token=${encodeURIComponent(acc.access_token)}`,
  );
  const groupsJson = (await groupsRes.json()) as { data?: unknown[]; error?: { message?: string } };
  console.log("GROUPS:", JSON.stringify(groupsJson, null, 2));

  const pageId = acc.external_account_id;
  const testCaption = `Test PubliVende ${new Date().toISOString()}`;
  const photoRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: testCaption,
      published: false,
      access_token: acc.access_token,
    }),
  });
  const photoJson = await photoRes.json();
  console.log("UNPUBLISHED_DRAFT_TEST:", JSON.stringify(photoJson, null, 2));

  const permRes = await fetch(
    `https://graph.facebook.com/v21.0/me/permissions?access_token=${encodeURIComponent(acc.access_token)}`,
  );
  console.log("PERMISSIONS:", JSON.stringify(await permRes.json(), null, 2));
}

main()
  .then(() => sql.end())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
