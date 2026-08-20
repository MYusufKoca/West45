require('dotenv').config();

const fs = require('fs/promises');
const path = require('path');
const pool = require('./pool');

const migrationsDirectory = path.join(__dirname, 'migrations');

async function migrate() {
  let client;

  try {
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationFiles = (await fs.readdir(migrationsDirectory))
      .filter((filename) => filename.endsWith('.sql'))
      .sort();

    for (const filename of migrationFiles) {
      const applied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [filename]
      );

      if (applied.rowCount > 0) {
        console.log(`Skipping already applied migration: ${filename}`);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDirectory, filename), 'utf8');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      console.log(`Applied migration: ${filename}`);
    }

    console.log('Database migrations completed successfully.');
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Database migration failed:', error.message || error.code || error.name);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

migrate();
