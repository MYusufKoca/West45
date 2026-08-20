const express = require('express');
const {
  getServices, getServiceById, createService, updateService, deleteService,
} = require('../controllers/servicesController');
const { requireAdminAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getServices);
router.get('/:id', getServiceById);
router.post('/', requireAdminAuth, createService);
router.put('/:id', requireAdminAuth, updateService);
router.delete('/:id', requireAdminAuth, deleteService);

module.exports = router;
