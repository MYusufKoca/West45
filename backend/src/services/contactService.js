const pool = require('../db/pool');

async function createContactRequest(contact) {
  const result = await pool.query(
    `INSERT INTO contact_requests (name, email, company, service, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at AS "createdAt"`,
    [contact.name, contact.email, contact.company, contact.service, contact.message]
  );

  return result.rows[0];
}

module.exports = { createContactRequest };
