const express = require('express');
const router = express.Router();
const genomeController = require('../../../controllers/genomeController');
const { authenticateToken } = require('../../../middleware/authMiddleware');

// All routes in this file require valid JWT
router.use(authenticateToken);

router.get('/', genomeController.getAllGenomes);

router.get('/:id', genomeController.getGenomeById);

module.exports = router;