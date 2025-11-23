// server/src/routes/stats.routes.js
const express = require('express')
const { readDb } = require('../db')
const { authMiddleware } = require('../middleware/authMiddleware')

const router = express.Router()

function ensureCollections(db) {
  if (!Array.isArray(db.dailyProgress)) db.dailyProgress = []
  if (!Array.isArray(db.weeklyProgress)) db.weeklyProgress = []
  if (!Array.isArray(db.progress)) db.progress = []
}

router.get('/overview', authMiddleware, (req, res) => {
  const db = readDb()
  ensureCollections(db)

  const userId = req.user.id

  const daily = db.dailyProgress
    .filter(d => d.userId === userId)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const weekly = db.weeklyProgress
    .filter(w => w.userId === userId)
    .sort((a, b) => {
      if (a.year === b.year) return a.week - b.week
      return a.year - b.year
    })

  // ---------- SUMMARY ----------
  const totalWorkouts = daily.reduce((acc, d) => acc + (d.workoutsCount || 0), 0)
  const totalMinutes = daily.reduce((acc, d) => acc + (d.minutesTrained || 0), 0)

  const avgWorkoutsPerWeek = weekly.length
    ? Number(
        (
          weekly.reduce((acc, w) => acc + (w.workoutsCount || 0), 0) /
          weekly.length
        ).toFixed(1)
      )
    : 0

  // peso actual: priorizamos último peso diario, si no, el currentWeight del usuario
  let currentWeight = null
  const lastDailyWithWeight = [...daily].reverse().find(d => d.weight != null)

  if (lastDailyWithWeight) {
    currentWeight = lastDailyWithWeight.weight
  } else {
    const user = db.users.find(u => u.id === userId)
    currentWeight = user?.currentWeight ?? null
  }

  // diferencia de peso últimos 30 días
  let weightDiffLast30Days = null
  if (daily.length) {
    const now = new Date()
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

    const last30 = daily
      .filter(d => {
        if (!d.weight && d.weight !== 0) return false
        const dt = new Date(d.date)
        return now - dt <= THIRTY_DAYS
      })
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

    if (last30.length >= 2) {
      const first = last30[0].weight
      const last = last30[last30.length - 1].weight
      weightDiffLast30Days = Number((last - first).toFixed(1))
    }
  }

  const summary = {
    totalWorkouts,
    totalMinutes,
    avgWorkoutsPerWeek,
    currentWeight,
    weightDiffLast30Days
  }

  // ---------- BY WEEK ----------
  const byWeek = weekly.map(w => ({
    weekStart: w.weekStart,
    weekEnd: w.weekEnd,
    workouts: w.workoutsCount || 0,
    minutes: w.minutesTrained || 0,
    volume: null, // podrías calcular volumen después
    avgWeight: w.avgWeight ?? null
  }))

  // ---------- BY MUSCLE GROUP ----------
  const muscleMap = new Map()

  daily.forEach(d => {
    if (!Array.isArray(d.muscleGroups)) return
    d.muscleGroups.forEach(g => {
      const key = g.trim()
      if (!key) return
      muscleMap.set(key, (muscleMap.get(key) || 0) + 1)
    })
  })

  const byMuscleGroup = Array.from(muscleMap.entries()).map(
    ([muscleGroup, sessions]) => ({ muscleGroup, sessions })
  )

  res.json({
    summary,
    byWeek,
    byMuscleGroup
  })
})

module.exports = router
