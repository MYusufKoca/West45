const express = require('express');
const {
  getProjects, getProjectById, createProject, updateProject, deleteProject,
} = require('../controllers/projectsController');
const { requireAdminAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', requireAdminAuth, createProject);
router.put('/:id', requireAdminAuth, updateProject);
router.delete('/:id', requireAdminAuth, deleteProject);

module.exports = router;
