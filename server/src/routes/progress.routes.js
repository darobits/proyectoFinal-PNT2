const express = require('express')
const { readDb, writeDb, getNextId } = require('../db')
const { authMiddleware } = require('../middleware/authMiddleware')

const router = express.Router()

// Helper: validar que el que pide sea el dueño o ADMIN
function canAccessProgress(requestUser, targetUserId) {
  if (!requestUser) return false
  if (requestUser.role === 'ADMIN') return true
  return requestUser.id === targetUserId
}

// GET /api/progress/user/:userId → progreso de un usuario
router.get('/user/:userId', authMiddleware, (req, res) => {
  const userId = Number(req.params.userId)
  const db = readDb()

  if (!canAccessProgress(req.user, userId)) {
    return res.status(403).json({ error: 'No tenés permisos para ver este progreso' })
  }

  const entries = db.progress.filter(p => p.userId === userId)

  // ordenar por año/mes
  entries.sort((a, b) => {
    if (a.year === b.year) return a.month - b.month
    return a.year - b.year
  })

  res.json(entries)
})

// POST /api/progress/user/:userId
// Crea o actualiza el progreso de un mes para ese usuario
router.post('/user/:userId', authMiddleware, (req, res) => {
  const userId = Number(req.params.userId)
  const { year, month, weight, workoutsCount, minutesTrained } = req.body

  if (!year || !month) {
    return res.status(400).json({ error: 'Year y month son obligatorios' })
  }

  if (!canAccessProgress(req.user, userId)) {
    return res.status(403).json({ error: 'No tenés permisos para modificar este progreso' })
  }

  const db = readDb()

  // buscamos si ya había registro para ese año/mes/usuario
  let entry = db.progress.find(
    p => p.userId === userId && p.year === year && p.month === month
  )

  if (!entry) {
    // crear nuevo
    entry = {
      id: getNextId(db.progress),
      userId,
      year,
      month,
      weight: weight ?? null,
      workoutsCount: workoutsCount ?? 0,
      minutesTrained: minutesTrained ?? 0
    }
    db.progress.push(entry)
  } else {
    // actualizar existente
    if (weight !== undefined) entry.weight = weight
    if (workoutsCount !== undefined) entry.workoutsCount = workoutsCount
    if (minutesTrained !== undefined) entry.minutesTrained = minutesTrained
  }

  writeDb(db)
  res.json(entry)
})

module.exports = router
