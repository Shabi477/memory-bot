const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_sriwjB2CL1qT@ep-winter-poetry-abtnju00-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require');

async function check() {
  const users = await sql`SELECT id, email, name, created_at FROM users`;
  console.log(users.length ? users : 'No users yet');
}

check().catch(e => console.log('Error:', e.message));
