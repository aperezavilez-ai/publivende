import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function main() {
  const users = await sql`
    SELECT id, email, nombre, nombre_negocio, ciudad, plan
    FROM users WHERE email ILIKE '%aperez%' OR email ILIKE '%publivende%'
    LIMIT 5
  `;
  console.log("USERS:", JSON.stringify(users, null, 2));

  for (const u of users) {
    const oauth = await sql`
      SELECT red, nombre_cuenta, external_account_id, estado_conexion, oauth_provider,
             LEFT(access_token, 12) AS token_prefix, token_expires_at
      FROM oauth_accounts WHERE user_id = ${u.id}
    `;
    console.log(`OAUTH [${u.email}]:`, JSON.stringify(oauth, null, 2));

    const posts = await sql`
      SELECT id, estado, tracking_slug, external_ids, total_canales, publish_surfaces IS NOT NULL AS has_surfaces, created_at
      FROM posts WHERE user_id = ${u.id}
      ORDER BY created_at DESC LIMIT 3
    `;
    console.log(`POSTS [${u.email}]:`, JSON.stringify(posts, null, 2));

    const dist = await sql`
      SELECT channel_type, channel_name, status, error
      FROM post_distributions WHERE user_id = ${u.id}
      ORDER BY created_at DESC LIMIT 8
    `;
    console.log(`DIST [${u.email}]:`, JSON.stringify(dist, null, 2));

    const groups = await sql`
      SELECT group_name, member_count, can_post FROM user_facebook_groups WHERE user_id = ${u.id}
    `;
    console.log(`GROUPS [${u.email}]:`, JSON.stringify(groups, null, 2));
  }
}

main()
  .then(() => sql.end())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
