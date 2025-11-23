const express = require('express')
const router = express.Router()

const { authMiddleware } = require('../middleware/authMiddleware')
const { getOverview, getProgress } = require('../controllers/stats.controller')

// Estadísticas generales
router.get('/overview', authMiddleware, getOverview)

// Progreso detallado
router.get('/progress', authMiddleware, getProgress)

module.exports = router
