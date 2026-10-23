import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function verifyDatabase() {
  // DATABASE_URL debe estar en las variables de entorno
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL no está configurada');
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    console.log('🔍 Verificando conexión a Supabase...\n');

    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('✅ Conexión exitosa a Supabase!');
    console.log(`📊 Total de tablas: ${result.length}\n`);
    console.log('Tablas creadas:');
    result.forEach((row: any, i: number) => {
      console.log(`  ${i + 1}. ${row.table_name}`);
    });

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al verificar la base de datos:', error);
    await client.end();
    process.exit(1);
  }
}

verifyDatabase();
