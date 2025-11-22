const express = require('express')
const bcrypt = require('bcryptjs')
const { readDb, writeDb, getNextId } = require('../db')
const { authMiddleware } = require('../middleware/authMiddleware')

const router = express.Router()

// --- Helpers --------------------------------------------------

function ensureAdmin(req, res) {
  const db = readDb()
  const currentUser = db.users.find(u => u.id === req.user.id)

  if (!currentUser) {
    res.status(401).json({ error: 'Usuario autenticado no encontrado' })
    return null
  }

  if (currentUser.role !== 'ADMIN') {
    res.status(403).json({ error: 'Solo los administradores pueden realizar esta acción' })
    return null
  }

  return { db, currentUser }
}

// --- Rutas para el propio usuario (/me) -----------------------

// GET /api/users/me → datos del usuario logueado
router.get('/me', authMiddleware, (req, res) => {
  const db = readDb()
  const user = db.users.find(u => u.id === req.user.id)

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  const { password, ...safeUser } = user
  res.json(safeUser)
})

// PUT /api/users/me → actualizar perfil (edad, peso, objetivo, contraseña, etc.)
router.put('/me', authMiddleware, async (req, res) => {
  const { name, age, height, currentWeight, goal, bio, password } = req.body
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

  // 👇 si el usuario escribió una nueva contraseña, la encriptamos
  if (password && password.trim().length > 0) {
    const hashed = await bcrypt.hash(password.trim(), 10)
    user.password = hashed
  }

  writeDb(db)

  const { password: _pw, ...safeUser } = user
  res.json(safeUser)
})

// --- Rutas ADMIN para gestionar usuarios ----------------------

// GET /api/users → listado completo (solo admin)
router.get('/', authMiddleware, (req, res) => {
  const ctx = ensureAdmin(req, res)
  if (!ctx) return
  const { db } = ctx

  const users = db.users.map(({ password, ...safe }) => safe)
  res.json(users)
})

// POST /api/users → crear usuario (solo admin)
router.post('/', authMiddleware, async (req, res) => {
  const ctx = ensureAdmin(req, res)
  if (!ctx) return
  const { db } = ctx

  const {
    name,
    email,
    password,
    role = 'USER',
    age = null,
    height = null,
    currentWeight = null,
    goal = '',
    bio = ''
  } = req.body

  if (!name || !email) {
    return res.status(400).json({ error: 'Nombre y email son obligatorios' })
  }

  if (db.users.some(u => u.email === email)) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese email' })
  }

  const plainPassword = password || 'changeme123'
  const hashedPassword = await bcrypt.hash(plainPassword, 10)

  const newUser = {
    id: getNextId(db.users),
    name,
    email,
    password: hashedPassword,
    role,
    age,
    height,
    currentWeight,
    goal,
    bio
  }

  db.users.push(newUser)
  writeDb(db)

  const { password: _, ...safeUser } = newUser
  res.status(201).json(safeUser)
})

// PUT /api/users/:id → editar usuario (solo admin)
router.put('/:id', authMiddleware, (req, res) => {
  const ctx = ensureAdmin(req, res)
  if (!ctx) return
  const { db } = ctx

  const userId = Number(req.params.id)
  const user = db.users.find(u => u.id === userId)

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  const { name, email, age, height, currentWeight, goal, bio, role } = req.body

  if (name !== undefined) user.name = name
  if (email !== undefined) user.email = email
  if (age !== undefined) user.age = age
  if (height !== undefined) user.height = height
  if (currentWeight !== undefined) user.currentWeight = currentWeight
  if (goal !== undefined) user.goal = goal
  if (bio !== undefined) user.bio = bio
  if (role !== undefined) user.role = role

  writeDb(db)

  const { password, ...safeUser } = user
  res.json(safeUser)
})



// DELETE /api/users/:id → eliminar usuario (solo admin)
router.delete('/:id', authMiddleware, (req, res) => {
  const ctx = ensureAdmin(req, res)
  if (!ctx) return
  const { db } = ctx

  const userId = Number(req.params.id)
  const idx = db.users.findIndex(u => u.id === userId)

  if (idx === -1) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  db.users.splice(idx, 1)
  writeDb(db)

  res.status(204).send()
})

module.exports = router
