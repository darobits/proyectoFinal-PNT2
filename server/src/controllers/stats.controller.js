// server/src/controllers/stats.controller.js
const { readDb } = require('../db')

/**
 * GET /api/stats/overview
 * Usa:
 *   - db.progress        → mensual (ya agregado)
 *   - db.weeklyProgress  → semanal
 *   - db.dailyProgress   → grupos musculares
 */
exports.getOverview = (req, res) => {
  try {
    const db = readDb()
    const userId = req.user.id

    const user = db.users.find(u => u.id === userId)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    // ── Mensual (colección progress) ──────────────────────────────
    const monthly = (db.progress || [])
      .filter(p => p.userId === userId)
      .sort((a, b) => {
        if (a.year === b.year) return a.month - b.month
        return a.year - b.year
      })

    let totalWorkouts = 0
    let totalMinutes = 0

    monthly.forEach(e => {
      totalWorkouts += e.workoutsCount || 0
      totalMinutes += e.minutesTrained || 0
    })

    const avgWorkoutsPerWeek = monthly.length
      ? totalWorkouts / (monthly.length * 4) // aproximación: 4 semanas por mes
      : 0

    const currentWeight = monthly.length
      ? monthly[monthly.length - 1].weight
      : user.currentWeight ?? null

    let weightDiffLast30Days = 0
    if (monthly.length >= 2) {
      const last = monthly[monthly.length - 1].weight
      const prev = monthly[monthly.length - 2].weight
      if (last != null && prev != null) {
        weightDiffLast30Days = Number((last - prev).toFixed(1))
      }
    }

    // ── Semanal (weeklyProgress) ─────────────────────────────────
    const weekly = (db.weeklyProgress || [])
      .filter(w => w.userId === userId)
      .sort((a, b) => {
        if (a.year === b.year) return a.week - b.week
        return a.year - b.year
      })

    const byWeek = weekly.map(w => ({
      weekStart: w.weekStart,
      weekEnd: w.weekEnd,
      workouts: w.workoutsCount,
      minutes: w.minutesTrained,
      volume: null,
      avgWeight: w.avgWeight
    }))

    // ── Distribución por grupo muscular (desde dailyProgress) ────
    const daily = (db.dailyProgress || []).filter(d => d.userId === userId)
    const muscleCounter = {}

    daily.forEach(d => {
      const groups = Array.isArray(d.muscleGroups) ? d.muscleGroups : []
      groups.forEach(g => {
        const key = g.toLowerCase()
        muscleCounter[key] = (muscleCounter[key] || 0) + 1
      })
    })

    const byMuscleGroup = Object.entries(muscleCounter).map(
      ([muscleGroup, sessions]) => ({ muscleGroup, sessions })
    )

    return res.json({
      summary: {
        totalWorkouts,
        totalMinutes,
        avgWorkoutsPerWeek,
        currentWeight,
        weightDiffLast30Days
      },
      byWeek,
      byMuscleGroup
    })
  } catch (err) {
    console.error('[Stats Overview Error]', err)
    res.status(500).json({ error: 'Error generando overview' })
  }
}

/**
 * GET /api/stats/progress
 * De momento lo dejamos simple y devolvemos las curvas
 * mensual a partir de db.progress (por si querés usarlo después).
 */
exports.getProgress = (req, res) => {
  try {
    const db = readDb()
    const userId = req.user.id

    const monthly = (db.progress || [])
      .filter(p => p.userId === userId)
      .sort((a, b) => {
        if (a.year === b.year) return a.month - b.month
        return a.year - b.year
      })

    const weightProgress = monthly.map(e => ({
      date: `${e.year}-${String(e.month).padStart(2, '0')}-01`,
      weight: e.weight
    }))

    const workoutProgress = monthly.map(e => ({
      date: `${e.year}-${String(e.month).padStart(2, '0')}-01`,
      workouts: e.workoutsCount,
      minutes: e.minutesTrained
    }))

    res.json({ weightProgress, workoutProgress })
  } catch (err) {
    console.error('[Stats Progress Error]', err)
    res.status(500).json({ error: 'Error generando progreso' })
  }
}
