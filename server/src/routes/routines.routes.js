const express = require('express')
const { readDb, writeDb, getNextId } = require('../db')
const { authMiddleware } = require('../middleware/authMiddleware')

const router = express.Router()

// Helper para encontrar rutina
function findRoutine(db, id) {
  return db.routines.find(r => r.id === id)
}

// Helper: verificar si el usuario puede editar (creador, colaborador o ADMIN)
function canEditRoutine(routine, user) {
  if (!routine || !user) return false
  if (user.role === 'ADMIN') return true
  if (routine.creatorId === user.id) return true
  if (Array.isArray(routine.collaboratorsIds) && routine.collaboratorsIds.includes(user.id)) return true
  return false
}

// GET /api/routines  → lista todas las rutinas
router.get('/', (req, res) => {
  const db = readDb()

  const routines = db.routines.map(r => ({
    ...r,
    likes: Array.isArray(r.likedByIds) ? r.likedByIds.length : 0
  }))

  res.json(routines)
})

// GET /api/routines/:id → detalle de una rutina
router.get('/:id', (req, res) => {
  const id = Number(req.params.id)
  const db = readDb()

  const routine = findRoutine(db, id)
  if (!routine) {
    return res.status(404).json({ error: 'Rutina no encontrada' })
  }

  const routineWithLikes = {
    ...routine,
    likes: Array.isArray(routine.likedByIds) ? routine.likedByIds.length : 0
  }

  res.json(routineWithLikes)
})

// POST /api/routines → crear rutina (requiere auth)
router.post('/', authMiddleware, (req, res) => {
  const { title, description, category, level } = req.body

  if (!title || !description || !category || !level) {
    return res.status(400).json({ error: 'Faltan datos de la rutina' })
  }

  const db = readDb()

  const newRoutine = {
    id: getNextId(db.routines),
    title,
    description,
    category,
    level,
    creatorId: req.user.id,
    collaboratorsIds: [],
    likedByIds: [],
    createdAt: new Date().toISOString()
  }

  db.routines.push(newRoutine)
  writeDb(db)

  res.status(201).json({
    ...newRoutine,
    likes: 0
  })
})

// PUT /api/routines/:id → editar rutina (creador, colaborador o ADMIN)
router.put('/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id)
  const { title, description, category, level } = req.body

  const db = readDb()
  const routine = findRoutine(db, id)

  if (!routine) {
    return res.status(404).json({ error: 'Rutina no encontrada' })
  }

  if (!canEditRoutine(routine, req.user)) {
    return res.status(403).json({ error: 'No tenés permisos para editar esta rutina' })
  }

  if (title !== undefined) routine.title = title
  if (description !== undefined) routine.description = description
  if (category !== undefined) routine.category = category
  if (level !== undefined) routine.level = level

  writeDb(db)

  res.json({
    ...routine,
    likes: Array.isArray(routine.likedByIds) ? routine.likedByIds.length : 0
  })
})

// DELETE /api/routines/:id → eliminar rutina (creador o ADMIN)
router.delete('/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id)
  const db = readDb()

  const routine = findRoutine(db, id)
  if (!routine) {
    return res.status(404).json({ error: 'Rutina no encontrada' })
  }

  if (!(req.user.role === 'ADMIN' || routine.creatorId === req.user.id)) {
    return res.status(403).json({ error: 'No tenés permisos para eliminar esta rutina' })
  }

  db.routines = db.routines.filter(r => r.id !== id)
  writeDb(db)

  res.json({ message: 'Rutina eliminada' })
})

// POST /api/routines/:id/like → like/unlike (toggle) de rutina
router.post('/:id/like', authMiddleware, (req, res) => {
  const id = Number(req.params.id)
  const db = readDb()

  const routine = findRoutine(db, id)
  if (!routine) {
    return res.status(404).json({ error: 'Rutina no encontrada' })
  }

  if (!Array.isArray(routine.likedByIds)) {
    routine.likedByIds = []
  }

  const alreadyLiked = routine.likedByIds.includes(req.user.id)

  if (alreadyLiked) {
    // si ya la likeó, quitamos el like (toggle)
    routine.likedByIds = routine.likedByIds.filter(uid => uid !== req.user.id)
  } else {
    routine.likedByIds.push(req.user.id)
  }

  writeDb(db)

  res.json({
    ...routine,
    likes: routine.likedByIds.length
  })
})

// POST /api/routines/:id/collaborators → agregar colaborador (solo creador o ADMIN)
router.post('/:id/collaborators', authMiddleware, (req, res) => {
  const id = Number(req.params.id)
  const { userId } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'Falta userId de colaborador' })
  }

  const db = readDb()
  const routine = findRoutine(db, id)

  if (!routine) {
    return res.status(404).json({ error: 'Rutina no encontrada' })
  }

  if (!(req.user.role === 'ADMIN' || routine.creatorId === req.user.id)) {
    return res.status(403).json({ error: 'Solo el creador o un ADMIN puede agregar colaboradores' })
  }

  const collaborator = db.users.find(u => u.id === Number(userId))
  if (!collaborator) {
    return res.status(404).json({ error: 'Usuario colaborador no encontrado' })
  }

  if (!Array.isArray(routine.collaboratorsIds)) {
    routine.collaboratorsIds = []
  }

  if (!routine.collaboratorsIds.includes(collaborator.id)) {
    routine.collaboratorsIds.push(collaborator.id)
  }

  writeDb(db)

  res.json({
    ...routine,
    likes: Array.isArray(routine.likedByIds) ? routine.likedByIds.length : 0
  })
})

module.exports = router
