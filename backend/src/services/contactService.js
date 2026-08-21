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

async function getContactRequests() {
  const result = await pool.query(`
    SELECT id, name, email, company, service, message, created_at AS "createdAt"
    FROM contact_requests
    ORDER BY created_at DESC, id DESC
  `);

  return result.rows;
}

async function getContactRequestById(id) {
  const result = await pool.query(`
    SELECT id, name, email, company, service, message, created_at AS "createdAt"
    FROM contact_requests
    WHERE id = $1
  `, [id]);

  return result.rows[0] || null;
}

async function deleteContactRequest(id) {
  const result = await pool.query('DELETE FROM contact_requests WHERE id = $1', [id]);
  return result.rowCount > 0;
}

module.exports = {
  createContactRequest,
  getContactRequests,
  getContactRequestById,
  deleteContactRequest,
};
