const { readDb } = require('../db')

/**
 * GET /api/stats/overview
 * Usa db.progress y db.users
 */
exports.getOverview = (req, res) => {
  try {
    const db = readDb()
    const userId = req.user.id

    const user = db.users.find(u => u.id === userId)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    // Progreso del usuario
    const entries = db.progress
      .filter(p => p.userId === userId)
      .sort((a, b) => {
        if (a.year === b.year) return a.month - b.month
        return a.year - b.year
      })

    // ---------- SUMMARY ----------
    let totalWorkouts = 0
    let totalMinutes = 0

    entries.forEach(e => {
      totalWorkouts += e.workoutsCount || 0
      totalMinutes += e.minutesTrained || 0
    })

    const avgWorkoutsPerMonth = entries.length
      ? totalWorkouts / entries.length
      : 0

    // peso actual = último del progreso o el del perfil si no hay progreso
    const currentWeight = entries.length
      ? entries[entries.length - 1].weight
      : user.currentWeight ?? null

    // peso hace 30 días = aproximación usando último mes anterior
    let weightDiffLast30Days = 0
    if (entries.length >= 2) {
      const last = entries[entries.length - 1].weight
      const prev = entries[entries.length - 2].weight
      weightDiffLast30Days = Number((last - prev).toFixed(1))
    }

    // ---------- AGRUPADO POR MES para gráficos ----------
    const byMonth = entries.map(e => ({
      year: e.year,
      month: e.month,
      workouts: e.workoutsCount,
      minutes: e.minutesTrained
    }))

    // ---------- AGRUPACIÓN POR RUTINA ASOCIADA? ----------
    // Si no querés rutinas, lo dejamos vacío.
    const byMuscleGroup = []

    return res.json({
      summary: {
        totalWorkouts,
        totalMinutes,
        avgWorkoutsPerMonth,
        currentWeight,
        weightDiffLast30Days
      },
      byMonth,
      byMuscleGroup
    })
  } catch (err) {
    console.error('[Stats Overview Error]', err)
    res.status(500).json({ error: 'Error generando overview' })
  }
}

/**
 * GET /api/stats/progress
 * Devuelve estructura para gráficos de "Mi Progreso"
 */
exports.getProgress = (req, res) => {
  try {
    const db = readDb()
    const userId = req.user.id

    const entries = db.progress
      .filter(p => p.userId === userId)
      .sort((a, b) => {
        if (a.year === b.year) return a.month - b.month
        return a.year - b.year
      })

    // Línea de tiempo de peso
    const weightProgress = entries.map(e => ({
      date: `${e.year}-${String(e.month).padStart(2, '0')}-01`,
      weight: e.weight
    }))

    // Línea de tiempo de entrenamientos/minutos
    const workoutProgress = entries.map(e => ({
      date: `${e.year}-${String(e.month).padStart(2, '0')}-01`,
      workouts: e.workoutsCount,
      minutes: e.minutesTrained
    }))

    res.json({
      weightProgress,
      workoutProgress
    })
  } catch (err) {
    console.error('[Stats Progress Error]', err)
    res.status(500).json({ error: 'Error generando progreso' })
  }
}
