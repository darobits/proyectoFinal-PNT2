const express = require('express')
const { readDb, writeDb } = require('../db')
const { authMiddleware } = require('../middleware/authMiddleware')

const router = express.Router()

// GET /api/users/me → datos del usuario logueado
router.get('/me', authMiddleware, (req, res) => {
  const db = readDb()
  const user = db.users.find(u => u.id === req.user.id)

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  // no mandamos la password
  const { password, ...safeUser } = user
  res.json(safeUser)
})

// PUT /api/users/me → actualizar perfil (edad, peso, etc.)
router.put('/me', authMiddleware, (req, res) => {
  const { name, age, height, currentWeight, goal, bio } = req.body
  const db = readDb()
  const user = db.users.find(u => u.id === req.user.id)

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  if (name !== undefined) user.name = name
  if (age !== undefined) user.age = age
  if (height !== undefined) user.height = height
  if (currentWeight !== undefined) user.currentWeight = currentWeight
  if (goal !== undefined) user.goal = goal
  if (bio !== undefined) user.bio = bio

  writeDb(db)

  const { password, ...safeUser } = user
  res.json(safeUser)
})

// GET /api/users → listado (para mostrar autores / elegir colaboradores)
router.get('/', authMiddleware, (req, res) => {
  const db = readDb()
  const users = db.users.map(({ password, ...safe }) => safe)
  res.json(users)
})

module.exports = router
