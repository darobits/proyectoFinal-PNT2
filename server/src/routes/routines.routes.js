const express = require('express')
const { readDb, writeDb, getNextId } = require('../db')
const { authMiddleware } = require('../middleware/authMiddleware')

const router = express.Router()

// 🔹 GET /api/routines → rutinas donde soy creador o colaborador
router.get('/', authMiddleware, (req, res) => {
  const db = readDb()
  const userId = req.user.id

  const routines = db.routines.filter(r =>
    r.creatorId === userId ||
    (Array.isArray(r.collaboratorsIds) && r.collaboratorsIds.includes(userId))
  )

  res.json(routines)
})

// 🔹 GET /api/routines/:id → detalle de rutina
router.get('/:id', authMiddleware, (req, res) => {
  const db = readDb()
  const id = Number(req.params.id)

  const routine = db.routines.find(r => r.id === id)
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' })

  res.json(routine)
})

// 🔹 POST /api/routines → crear rutina nueva
router.post('/', authMiddleware, (req, res) => {
  const db = readDb()
  const {
    title,
    description,
    category,
    level,
    isPublic = true,
    allowCollab = true
  } = req.body

  if (!title) {
    return res.status(400).json({ error: 'El título es obligatorio' })
  }

  const newRoutine = {
    id: getNextId(db.routines),
    title,
    description: description || '',
    category: category || '',
    level: level || 'Sin nivel',
    creatorId: req.user.id,
    collaboratorsIds: [],
    likedByIds: [],
    isPublic,
    allowCollab,
    pendingCollabIds: [],
    createdAt: new Date().toISOString()
  }

  db.routines.push(newRoutine)
  writeDb(db)

  res.status(201).json(newRoutine)
})

// 🔹 PUT /api/routines/:id → editar (solo creador o ADMIN)
router.put('/:id', authMiddleware, (req, res) => {
  const db = readDb()
  const id = Number(req.params.id)
  const userId = req.user.id
  const role = req.user.role

  const routine = db.routines.find(r => r.id === id)
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' })

  if (routine.creatorId !== userId && role !== 'ADMIN') {
    return res.status(403).json({ error: 'No tenés permisos para editar esta rutina' })
  }

  const {
    title,
    description,
    category,
    level,
    isPublic,
    allowCollab
  } = req.body

  if (title !== undefined) routine.title = title
  if (description !== undefined) routine.description = description
  if (category !== undefined) routine.category = category
  if (level !== undefined) routine.level = level
  if (isPublic !== undefined) routine.isPublic = isPublic
  if (allowCollab !== undefined) routine.allowCollab = allowCollab

  writeDb(db)
  res.json(routine)
})

// 🔹 DELETE /api/routines/:id → eliminar (solo creador o ADMIN)
router.delete('/:id', authMiddleware, (req, res) => {
  const db = readDb()
  const id = Number(req.params.id)
  const userId = req.user.id
  const role = req.user.role

  const idx = db.routines.findIndex(r => r.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Rutina no encontrada' })

  const routine = db.routines[idx]

  if (routine.creatorId !== userId && role !== 'ADMIN') {
    return res.status(403).json({ error: 'No tenés permisos para eliminar esta rutina' })
  }

  db.routines.splice(idx, 1)
  writeDb(db)

  res.json({ ok: true })
})

// ╔══════════════════════════════════════════╗
// ║          ENDPOINTS SOCIALES             ║
// ╚══════════════════════════════════════════╝

// 🔹 GET /api/routines/discover → rutinas públicas de otros usuarios
router.get('/discover/list', authMiddleware, (req, res) => {
  const db = readDb()
  const userId = req.user.id

  const routines = db.routines.filter(r => {
    const isPublic = r.isPublic === undefined ? true : !!r.isPublic
    return (
      isPublic &&
      r.creatorId !== userId
    )
  })

  res.json(routines)
})

// 🔹 POST /api/routines/:id/toggle-like
router.post('/:id/toggle-like', authMiddleware, (req, res) => {
  const db = readDb()
  const userId = req.user.id
  const id = Number(req.params.id)

  const routine = db.routines.find(r => r.id === id)
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' })

  if (!Array.isArray(routine.likedByIds)) {
    routine.likedByIds = []
  }

  if (routine.likedByIds.includes(userId)) {
    routine.likedByIds = routine.likedByIds.filter(uid => uid !== userId)
  } else {
    routine.likedByIds.push(userId)
  }

  writeDb(db)
  res.json(routine)
})

// 🔹 POST /api/routines/:id/request-collab
router.post('/:id/request-collab', authMiddleware, (req, res) => {
  const db = readDb()
  const userId = req.user.id
  const id = Number(req.params.id)

  const routine = db.routines.find(r => r.id === id)
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' })

  if (!routine.allowCollab) {
    return res.status(400).json({ error: 'La rutina no admite colaboradores' })
  }

  if (!Array.isArray(routine.pendingCollabIds)) {
    routine.pendingCollabIds = []
  }
  if (!Array.isArray(routine.collaboratorsIds)) {
    routine.collaboratorsIds = []
  }

  if (
    routine.pendingCollabIds.includes(userId) ||
    routine.collaboratorsIds.includes(userId) ||
    routine.creatorId === userId
  ) {
    return res.status(400).json({ error: 'Ya sos colaborador o tenés solicitud pendiente' })
  }

  routine.pendingCollabIds.push(userId)
  writeDb(db)
  res.json(routine)
})

// 🔹 POST /api/routines/:id/approve-collab
router.post('/:id/approve-collab', authMiddleware, (req, res) => {
  const db = readDb()
  const ownerId = req.user.id
  const role = req.user.role
  const id = Number(req.params.id)
  const { collaboratorId } = req.body

  const routine = db.routines.find(r => r.id === id)
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' })

  // solo creador o ADMIN
  if (routine.creatorId !== ownerId && role !== 'ADMIN') {
    return res.status(403).json({ error: 'No tenés permisos para aprobar colaboradores' })
  }

  if (!Array.isArray(routine.pendingCollabIds)) routine.pendingCollabIds = []
  if (!Array.isArray(routine.collaboratorsIds)) routine.collaboratorsIds = []

  const cId = Number(collaboratorId)
  if (!routine.pendingCollabIds.includes(cId)) {
    return res.status(400).json({ error: 'Solicitud inexistente' })
  }

  routine.pendingCollabIds = routine.pendingCollabIds.filter(cid => cid !== cId)
  if (!routine.collaboratorsIds.includes(cId)) {
    routine.collaboratorsIds.push(cId)
  }

  writeDb(db)
  res.json(routine)
})

module.exports = router
