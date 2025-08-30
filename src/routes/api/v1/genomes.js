const express = require('express');
const router = express.Router();
const genomeController = require('../../../controllers/genomeController');
const { authenticateToken, authoriseAdmin } = require('../../../middleware/authMiddleware');

// All routes in this file require valid JWT and are for admins only
router.use(authenticateToken);
router.use(authoriseAdmin);

router.get('/', genomeController.getAllGenomes);

module.exports = router;