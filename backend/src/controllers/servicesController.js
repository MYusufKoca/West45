const pool = require('../db/pool');
const { validateService } = require('../validators/serviceValidator');

const serviceColumns = `
  id,
  name_tr AS "nameTr",
  name_en AS "nameEn",
  preview_image_url AS "previewImageUrl",
  display_order AS "displayOrder"
`;

function parseServiceId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function getServiceValues(service) {
  return [
    service.nameTr.trim(),
    service.nameEn.trim(),
    service.previewImageUrl === undefined ? null : service.previewImageUrl,
    service.displayOrder,
  ];
}

function respondWithValidationError(res, service) {
  const details = validateService(service);
  if (details.length === 0) return false;
  res.status(400).json({ error: 'Validation failed', details });
  return true;
}

async function getServices(req, res) {
  try {
    const result = await pool.query(`SELECT ${serviceColumns} FROM services ORDER BY display_order ASC, id ASC`);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Failed to fetch services:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getServiceById(req, res) {
  const id = parseServiceId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid service id' });
  try {
    const result = await pool.query(`SELECT ${serviceColumns} FROM services WHERE id = $1`, [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Service not found' });
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch service:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createService(req, res) {
  if (respondWithValidationError(res, req.body || {})) return;
  try {
    const result = await pool.query(`
      INSERT INTO services (name_tr, name_en, preview_image_url, display_order)
      VALUES ($1, $2, $3, $4)
      RETURNING ${serviceColumns}
    `, getServiceValues(req.body));
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create service:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateService(req, res) {
  const id = parseServiceId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid service id' });
  if (respondWithValidationError(res, req.body || {})) return;
  try {
    const result = await pool.query(`
      UPDATE services SET
        name_tr = $1, name_en = $2, preview_image_url = $3, display_order = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [...getServiceValues(req.body), id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Service not found' });
    return res.status(204).send();
  } catch (error) {
    console.error('Failed to update service:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteService(req, res) {
  const id = parseServiceId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid service id' });
  try {
    const result = await pool.query('DELETE FROM services WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Service not found' });
    return res.status(204).send();
  } catch (error) {
    console.error('Failed to delete service:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getServices, getServiceById, createService, updateService, deleteService };
