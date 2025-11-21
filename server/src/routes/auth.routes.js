const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const { readDb, writeDb, getNextId } = require('../db')
const { SECRET } = require('../middleware/authMiddleware')

const router = express.Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role = "USER" } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Faltan datos" })
  }

  // 1️⃣ Leer DB
  const db = readDb()

  // 2️⃣ Verificar si ya existe
  const exists = db.users.find(u => u.email === email)
  if (exists) {
    return res.status(400).json({ error: "El email ya está registrado" })
  }

  // 3️⃣ Encriptar contraseña
  const hashed = await bcrypt.hash(password, 10)

  // 4️⃣ Crear usuario
  const newUser = {
    id: getNextId(db.users),
    name,
    email,
    password: hashed,
    role,
    age: null,
    height: null,
    currentWeight: null,
    goal: "",
    bio: ""
  }

  // 5️⃣ Guardar en DB
  db.users.push(newUser)
  writeDb(db)

  // 6️⃣ Crear token
  const token = jwt.sign(
    { id: newUser.id, role: newUser.role },
    SECRET,
    { expiresIn: "1d" }
  )

  // 7️⃣ Responder
  res.json({
    usuario: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    },
    token
  })
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: "Faltan datos" })
  }

  const db = readDb()

  const user = db.users.find(u => u.email === email)
  if (!user) {
    return res.status(401).json({ error: "Credenciales inválidas" })
  }

  const ok = await bcrypt.compare(password, user.password)
  if (!ok) {
    return res.status(401).json({ error: "Credenciales inválidas" })
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    SECRET,
    { expiresIn: "1d" }
  )

  res.json({
    usuario: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    token
  })
})


module.exports = router
