// server/src/routes/progress.routes.js
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

// ────────────────────────────────────────────────
// Helpers para agregados (semanal / mensual)
// ────────────────────────────────────────────────
function ensureCollections(db) {
  if (!Array.isArray(db.dailyProgress)) db.dailyProgress = []
  if (!Array.isArray(db.weeklyProgress)) db.weeklyProgress = []
  if (!Array.isArray(db.progress)) db.progress = []
}

function getWeekKey(dateStr) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null

  const year = d.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const diffDays = Math.floor((d - startOfYear) / 86400000)
  const week = Math.floor(diffDays / 7) + 1 // semanita simple, suficiente para el TP

  return { year, week }
}

function recomputeAggregatesForUser(db, userId) {
  ensureCollections(db)

  const daily = db.dailyProgress.filter(d => d.userId === userId)

  // Si no hay días, limpiamos weekly y monthly del usuario y chau
  if (!daily.length) {
    db.weeklyProgress = db.weeklyProgress.filter(w => w.userId !== userId)
    db.progress = db.progress.filter(p => p.userId !== userId)
    return
  }

  // ── Agrupar por semana ────────────────────────
  const weekMap = new Map()

  daily.forEach(d => {
    const wk = getWeekKey(d.date)
    if (!wk) return

    const key = `${wk.year}-${wk.week}`

    if (!weekMap.has(key)) {
      weekMap.set(key, {
        userId,
        year: wk.year,
        week: wk.week,
        // usaremos el primer y último día de esa semana para rango
        minDate: d.date,
        maxDate: d.date,
        workoutsCount: 0,
        minutesTrained: 0,
        weightSum: 0,
        weightCount: 0
      })
    }

    const acc = weekMap.get(key)

    if (d.date < acc.minDate) acc.minDate = d.date
    if (d.date > acc.maxDate) acc.maxDate = d.date

    acc.workoutsCount += d.workoutsCount || 0
    acc.minutesTrained += d.minutesTrained || 0

    if (d.weight != null) {
      acc.weightSum += d.weight
      acc.weightCount += 1
    }
  })

  const weeklyRecords = Array.from(weekMap.values()).map(w => ({
    userId: w.userId,
    year: w.year,
    week: w.week,
    weekStart: w.minDate,
    weekEnd: w.maxDate,
    workoutsCount: w.workoutsCount,
    minutesTrained: w.minutesTrained,
    avgWeight: w.weightCount ? Number((w.weightSum / w.weightCount).toFixed(1)) : null
  }))

  // Limpiamos semanas anteriores de ese usuario y agregamos las nuevas
  db.weeklyProgress = db.weeklyProgress.filter(w => w.userId !== userId)
  let nextWeeklyId = getNextId(db.weeklyProgress)
  weeklyRecords.forEach(w => {
    w.id = nextWeeklyId++
    db.weeklyProgress.push(w)
  })

  // ── Agrupar por mes (monthly) a partir de daily ──────────────────
  const monthMap = new Map()

  daily.forEach(d => {
    if (!d.date) return
    const [yearStr, monthStr] = d.date.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)

    const key = `${year}-${month}`

    if (!monthMap.has(key)) {
      monthMap.set(key, {
        userId,
        year,
        month,
        workoutsCount: 0,
        minutesTrained: 0,
        dates: [],
        weightsByDate: {}
      })
    }

    const acc = monthMap.get(key)
    acc.workoutsCount += d.workoutsCount || 0
    acc.minutesTrained += d.minutesTrained || 0
    acc.dates.push(d.date)

    if (d.weight != null) {
      acc.weightsByDate[d.date] = d.weight
    }
  })

  const monthlyRecords = Array.from(monthMap.values()).map(m => {
    m.dates.sort()
    const firstDate = m.dates[0]
    const lastDate = m.dates[m.dates.length - 1]

    const startWeight = m.weightsByDate[firstDate] ?? null
    const endWeight = m.weightsByDate[lastDate] ?? startWeight

    return {
      userId: m.userId,
      year: m.year,
      month: m.month,
      workoutsCount: m.workoutsCount,
      minutesTrained: m.minutesTrained,
      weight: endWeight,
      startWeight,
      weightDiff: startWeight != null && endWeight != null
        ? Number((endWeight - startWeight).toFixed(1))
        : null
    }
  })

  // Reemplazamos los registros mensuales (`progress`) para ese usuario
  db.progress = db.progress.filter(p => p.userId !== userId)
  let nextMonthlyId = getNextId(db.progress)
  monthlyRecords.forEach(m => {
    m.id = nextMonthlyId++
    db.progress.push(m)
  })
}

// ────────────────────────────────────────────────
// RUTAS ORIGINALES (mensuales) - NO LAS TOCAMOS
// ────────────────────────────────────────────────

// GET /api/progress/user/:userId → progreso mensual de un usuario (colección "progress")
router.get('/user/:userId', authMiddleware, (req, res) => {
  const userId = Number(req.params.userId)
  const db = readDb()

  if (!canAccessProgress(req.user, userId)) {
    return res.status(403).json({ error: 'No tenés permisos para ver este progreso' })
  }

  const entries = db.progress
    .filter(p => p.userId === userId)
    .sort((a, b) => {
      if (a.year === b.year) return a.month - b.month
      return a.year - b.year
    })

  res.json(entries)
})

// POST /api/progress/user/:userId
// 👉 la dejamos por compatibilidad, pero la idea es que empieces a usar la diaria
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
  ensureCollections(db)

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

// ────────────────────────────────────────────────
// NUEVAS RUTAS: PROGRESO DIARIO / SEMANAL / MENSUAL (derivado)
// ────────────────────────────────────────────────

// POST /api/progress/daily/:userId → registrar progreso de un día
router.post('/daily/:userId', authMiddleware, (req, res) => {
  const userId = Number(req.params.userId)
  const { date, weight, workoutsCount = 0, minutesTrained = 0, muscleGroups = [] } = req.body

  if (!date) {
    return res.status(400).json({ error: 'El campo date (YYYY-MM-DD) es obligatorio' })
  }

  if (!canAccessProgress(req.user, userId)) {
    return res.status(403).json({ error: 'No tenés permisos para modificar este progreso' })
  }

  const db = readDb()
  ensureCollections(db)

  // Si ya existe un registro para ese día/usuario, lo actualizamos
  let entry = db.dailyProgress.find(d => d.userId === userId && d.date === date)

  if (!entry) {
    entry = {
      id: getNextId(db.dailyProgress),
      userId,
      date,
      weight: weight ?? null,
      workoutsCount,
      minutesTrained,
      muscleGroups: Array.isArray(muscleGroups) ? muscleGroups : []
    }
    db.dailyProgress.push(entry)
  } else {
    if (weight !== undefined) entry.weight = weight
    if (workoutsCount !== undefined) entry.workoutsCount = workoutsCount
    if (minutesTrained !== undefined) entry.minutesTrained = minutesTrained
    if (muscleGroups !== undefined) {
      entry.muscleGroups = Array.isArray(muscleGroups) ? muscleGroups : []
    }
  }

  // Recalculamos semanales + mensuales para ese usuario
  recomputeAggregatesForUser(db, userId)

  writeDb(db)
  res.json(entry)
})

// GET /api/progress/daily/:userId → todos los días de un usuario
router.get('/daily/:userId', authMiddleware, (req, res) => {
  const userId = Number(req.params.userId)
  const db = readDb()
  ensureCollections(db)

  if (!canAccessProgress(req.user, userId)) {
    return res.status(403).json({ error: 'No tenés permisos para ver este progreso' })
  }

  const entries = db.dailyProgress
    .filter(d => d.userId === userId)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  res.json(entries)
})

// GET /api/progress/weekly/:userId → semanas agregadas
router.get('/weekly/:userId', authMiddleware, (req, res) => {
  const userId = Number(req.params.userId)
  const db = readDb()
  ensureCollections(db)

  if (!canAccessProgress(req.user, userId)) {
    return res.status(403).json({ error: 'No tenés permisos para ver este progreso' })
  }

  const entries = db.weeklyProgress
    .filter(w => w.userId === userId)
    .sort((a, b) => {
      if (a.year === b.year) return a.week - b.week
      return a.year - b.year
    })

  res.json(entries)
})

// GET /api/progress/monthly/:userId → mensuales agregados (espejo de /user/:id pero derivado de daily)
router.get('/monthly/:userId', authMiddleware, (req, res) => {
  const userId = Number(req.params.userId)
  const db = readDb()
  ensureCollections(db)

  if (!canAccessProgress(req.user, userId)) {
    return res.status(403).json({ error: 'No tenés permisos para ver este progreso' })
  }

  const entries = db.progress
    .filter(p => p.userId === userId)
    .sort((a, b) => {
      if (a.year === b.year) return a.month - b.month
      return a.year - b.year
    })

  res.json(entries)
})

module.exports = router
