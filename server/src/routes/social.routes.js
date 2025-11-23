// server/src/routes/social.routes.js
const express = require('express')
const fs = require('fs')
const path = require('path')

const router = express.Router()

// Ruta al db.json 
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'db.json')


function readDb() {
  const raw = fs.readFileSync(DB_PATH, 'utf-8')
  return JSON.parse(raw)
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

function ensureArrays(db) {
  if (!db.friendRequests) db.friendRequests = []
  if (!db.messages) db.messages = []
  if (!db.users) db.users = []
}

// Helper para obtener el id del usuario actual
function getCurrentUserId(req) {
  if (req.user && req.user.id) return Number(req.user.id) // por si en algún momento agregás middleware
  if (req.query.userId) return Number(req.query.userId)
  if (req.body && req.body.userId) return Number(req.body.userId)
  return null
}

// -----------------------------------------------------------------------------
// GET /api/social/friends  -> lista de amigos del usuario logueado
// -----------------------------------------------------------------------------
router.get('/friends', (req, res) => {
  const meId = getCurrentUserId(req)
  if (!meId) {
    return res.status(400).json({ message: 'Usuario no identificado' })
  }

  const db = readDb()
  ensureArrays(db)

  const me = db.users.find(u => u.id === meId)

  if (!me) {
    return res.status(404).json({ message: 'Usuario no encontrado' })
  }

  const friendIds = me.friends || []

  const friends = db.users
    .filter(u => friendIds.includes(u.id))
    .map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role
    }))

  res.json(friends)
})

// -----------------------------------------------------------------------------
// GET /api/social/requests  -> solicitudes recibidas y enviadas (pendientes)
// -----------------------------------------------------------------------------
router.get('/requests', (req, res) => {
  const meId = getCurrentUserId(req)
  if (!meId) {
    return res.status(400).json({ message: 'Usuario no identificado' })
  }

  const db = readDb()
  ensureArrays(db)

  const received = db.friendRequests
    .filter(fr => fr.toUserId === meId && fr.status === 'pending')
    .map(fr => ({
      ...fr,
      fromUser: db.users.find(u => u.id === fr.fromUserId) || null
    }))

  const sent = db.friendRequests
    .filter(fr => fr.fromUserId === meId && fr.status === 'pending')
    .map(fr => ({
      ...fr,
      toUser: db.users.find(u => u.id === fr.toUserId) || null
    }))

  res.json({ received, sent })
})

// -----------------------------------------------------------------------------
// POST /api/social/requests  -> enviar solicitud de amistad
// body: { toUserId, userId }
// -----------------------------------------------------------------------------
router.post('/requests', (req, res) => {
  const { toUserId } = req.body
  const fromId = getCurrentUserId(req)

  if (!fromId) {
    return res.status(400).json({ message: 'Usuario no identificado' })
  }

  const db = readDb()
  ensureArrays(db)

  const toId = Number(toUserId)

  if (!toId) {
    return res.status(400).json({ message: 'toUserId inválido' })
  }

  if (fromId === toId) {
    return res.status(400).json({ message: 'No podés enviarte solicitud a vos mismo' })
  }

  const toUser = db.users.find(u => u.id === toId)
  const me = db.users.find(u => u.id === fromId)

  if (!toUser || !me) {
    return res.status(404).json({ message: 'Usuario no encontrado' })
  }

  // Ya son amigos
  if ((me.friends || []).includes(toId)) {
    return res.status(400).json({ message: 'Ya son amigos' })
  }

  // Ya hay solicitud pendiente alguna de las dos direcciones
  const existing = db.friendRequests.find(fr =>
    fr.status === 'pending' &&
    ((fr.fromUserId === fromId && fr.toUserId === toId) ||
      (fr.fromUserId === toId && fr.toUserId === fromId))
  )

  if (existing) {
    return res.status(400).json({ message: 'Ya hay una solicitud pendiente' })
  }

  const newId = db.friendRequests.length
    ? Math.max(...db.friendRequests.map(fr => fr.id)) + 1
    : 1

  const newRequest = {
    id: newId,
    fromUserId: fromId,
    toUserId: toId,
    status: 'pending',
    createdAt: new Date().toISOString()
  }

  db.friendRequests.push(newRequest)
  writeDb(db)

  res.status(201).json(newRequest)
})

// -----------------------------------------------------------------------------
// POST /api/social/requests/:id/accept  -> aceptar solicitud
// body: { userId }
// -----------------------------------------------------------------------------
router.post('/requests/:id/accept', (req, res) => {
  const meId = getCurrentUserId(req)
  if (!meId) {
    return res.status(400).json({ message: 'Usuario no identificado' })
  }

  const requestId = Number(req.params.id)
  const db = readDb()
  ensureArrays(db)

  const request = db.friendRequests.find(fr => fr.id === requestId)

  if (!request) {
    return res.status(404).json({ message: 'Solicitud no encontrada' })
  }

  if (request.toUserId !== meId) {
    return res.status(403).json({ message: 'No podés aceptar esta solicitud' })
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ message: 'La solicitud ya fue procesada' })
  }

  request.status = 'accepted'
  request.respondedAt = new Date().toISOString()

  const me = db.users.find(u => u.id === meId)
  const other = db.users.find(u => u.id === request.fromUserId)

  if (!me || !other) {
    return res.status(404).json({ message: 'Usuario no encontrado' })
  }

  if (!me.friends) me.friends = []
  if (!other.friends) other.friends = []

  if (!me.friends.includes(other.id)) me.friends.push(other.id)
  if (!other.friends.includes(me.id)) other.friends.push(me.id)

  writeDb(db)

  res.json({ message: 'Solicitud aceptada', request })
})

// -----------------------------------------------------------------------------
// POST /api/social/requests/:id/reject  -> rechazar solicitud
// body: { userId }
// -----------------------------------------------------------------------------
router.post('/requests/:id/reject', (req, res) => {
  const meId = getCurrentUserId(req)
  if (!meId) {
    return res.status(400).json({ message: 'Usuario no identificado' })
  }

  const requestId = Number(req.params.id)
  const db = readDb()
  ensureArrays(db)

  const request = db.friendRequests.find(fr => fr.id === requestId)

  if (!request) {
    return res.status(404).json({ message: 'Solicitud no encontrada' })
  }

  if (request.toUserId !== meId) {
    return res.status(403).json({ message: 'No podés rechazar esta solicitud' })
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ message: 'La solicitud ya fue procesada' })
  }

  request.status = 'rejected'
  request.respondedAt = new Date().toISOString()

  writeDb(db)

  res.json({ message: 'Solicitud rechazada', request })
})

// -----------------------------------------------------------------------------
// GET /api/social/messages/:friendId  -> historial de mensajes con un amigo
// requiere userId (query/body)
// -----------------------------------------------------------------------------
router.get('/messages/:friendId', (req, res) => {
  const meId = getCurrentUserId(req)
  if (!meId) {
    return res.status(400).json({ message: 'Usuario no identificado' })
  }

  const friendId = Number(req.params.friendId)
  const db = readDb()
  ensureArrays(db)

  const me = db.users.find(u => u.id === meId)

  if (!me || !(me.friends || []).includes(friendId)) {
    return res.status(403).json({ message: 'Solo podés ver mensajes con tus amigos' })
  }

  const messages = db.messages
    .filter(m =>
      (m.fromUserId === meId && m.toUserId === friendId) ||
      (m.fromUserId === friendId && m.toUserId === meId)
    )
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  res.json(messages)
})

// -----------------------------------------------------------------------------
// POST /api/social/messages/:friendId  -> enviar mensaje
// body: { content, userId }
// -----------------------------------------------------------------------------
router.post('/messages/:friendId', (req, res) => {
  const meId = getCurrentUserId(req)
  if (!meId) {
    return res.status(400).json({ message: 'Usuario no identificado' })
  }

  const friendId = Number(req.params.friendId)
  const { content } = req.body

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'El mensaje no puede estar vacío' })
  }

  const db = readDb()
  ensureArrays(db)

  const me = db.users.find(u => u.id === meId)

  if (!me || !(me.friends || []).includes(friendId)) {
    return res.status(403).json({ message: 'Solo podés enviar mensajes a tus amigos' })
  }

  const newId = db.messages.length
    ? Math.max(...db.messages.map(m => m.id)) + 1
    : 1

  const newMessage = {
    id: newId,
    fromUserId: meId,
    toUserId: friendId,
    content: content.trim(),
    createdAt: new Date().toISOString()
  }

  db.messages.push(newMessage)
  writeDb(db)

  res.status(201).json(newMessage)
})

module.exports = router
