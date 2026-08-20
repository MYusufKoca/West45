const pool = require('../db/pool');
const { validateProject } = require('../validators/projectValidator');

const projectColumns = `
  id, title, tag, category,
  category_label_tr AS "categoryLabelTr",
  category_label_en AS "categoryLabelEn",
  description_tr AS "descriptionTr",
  description_en AS "descriptionEn",
  image_url AS "imageUrl",
  image_alt AS "imageAlt",
  link, layout, display_order AS "displayOrder"
`;

function parseProjectId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function getProjectValues(project) {
  return [
    project.title.trim(), project.tag.trim(), project.category, project.categoryLabelTr.trim(),
    project.categoryLabelEn.trim(), project.descriptionTr.trim(), project.descriptionEn.trim(),
    project.imageUrl.trim(), project.imageAlt.trim(), project.link === undefined ? null : project.link,
    project.layout, project.displayOrder,
  ];
}

function respondWithValidationError(res, project) {
  const details = validateProject(project);
  if (details.length === 0) return false;
  res.status(400).json({ error: 'Validation failed', details });
  return true;
}

async function getProjects(req, res) {
  try {
    const result = await pool.query(`SELECT ${projectColumns} FROM projects ORDER BY display_order ASC, id ASC`);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Failed to fetch projects:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getProjectById(req, res) {
  const id = parseProjectId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid project id' });
  try {
    const result = await pool.query(`SELECT ${projectColumns} FROM projects WHERE id = $1`, [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Project not found' });
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch project:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createProject(req, res) {
  if (respondWithValidationError(res, req.body || {})) return;
  try {
    const result = await pool.query(`
      INSERT INTO projects (
        title, tag, category, category_label_tr, category_label_en, description_tr,
        description_en, image_url, image_alt, link, layout, display_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING ${projectColumns}
    `, getProjectValues(req.body));
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create project:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateProject(req, res) {
  const id = parseProjectId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid project id' });
  if (respondWithValidationError(res, req.body || {})) return;
  try {
    const result = await pool.query(`
      UPDATE projects SET
        title = $1, tag = $2, category = $3, category_label_tr = $4,
        category_label_en = $5, description_tr = $6, description_en = $7,
        image_url = $8, image_alt = $9, link = $10, layout = $11,
        display_order = $12, updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
    `, [...getProjectValues(req.body), id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Project not found' });
    return res.status(204).send();
  } catch (error) {
    console.error('Failed to update project:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteProject(req, res) {
  const id = parseProjectId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid project id' });
  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Project not found' });
    return res.status(204).send();
  } catch (error) {
    console.error('Failed to delete project:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getProjects, getProjectById, createProject, updateProject, deleteProject };
