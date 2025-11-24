<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useStore } from 'vuex'
import axios from 'axios'
import { useToast } from '../composables/useToast'

// Chart.js
import Chart from 'chart.js/auto'

// Exportar a Excel y PDF
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const store = useStore()
const { showToast } = useToast()

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

const authConfig = computed(() => ({
  headers: {
    Authorization: `Bearer ${store.state.auth.token}`
  }
}))

const loading = ref(false)
const error = ref(null)

const overview = ref(null)

// refs a los canvas
const weeklyChartRef = ref(null)
const muscleChartRef = ref(null)

let weeklyChartInstance = null
let muscleChartInstance = null

// --------- MOCK de respaldo si el backend falla ---------
const mockOverview = {
  summary: {
    totalWorkouts: 18,
    totalMinutes: 930,
    avgWorkoutsPerWeek: 3.1,
    currentWeight: 78.2,
    weightDiffLast30Days: -1.4
  },
  byWeek: [
    {
      weekStart: '2025-10-20',
      weekEnd: '2025-10-26',
      workouts: 3,
      minutes: 150,
      avgWeight: 79.6
    },
    {
      weekStart: '2025-10-27',
      weekEnd: '2025-11-02',
      workouts: 4,
      minutes: 200,
      avgWeight: 79.0
    },
    {
      weekStart: '2025-11-03',
      weekEnd: '2025-11-09',
      workouts: 3,
      minutes: 165,
      avgWeight: 78.5
    }
  ],
  byMuscleGroup: [
    { muscleGroup: 'Pecho', sessions: 7 },
    { muscleGroup: 'Espalda', sessions: 6 },
    { muscleGroup: 'Piernas', sessions: 5 },
    { muscleGroup: 'Hombros', sessions: 4 },
    { muscleGroup: 'Cardio', sessions: 6 }
  ]
}

// ----------------- COMPUTEDS -----------------
const weeklyRows = computed(() => overview.value?.byWeek || [])
const summary = computed(() => overview.value?.summary || {})
const byMuscle = computed(() => overview.value?.byMuscleGroup || [])

// ----------------- CARGA DE DATOS -----------------
const loadStats = async () => {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/stats/overview', authConfig.value)
    overview.value = data
  } catch (e) {
    console.error('Error cargando estadísticas, usando mock:', e.response?.data || e.message)
    overview.value = mockOverview
    showToast('No se pudo cargar /stats/overview, mostrando datos de ejemplo.', 'info')
  } finally {
    loading.value = false
  }
}

// ----------------- GRÁFICOS -----------------
const buildWeeklyChart = () => {
  if (!weeklyChartRef.value || !weeklyRows.value.length) return

  if (weeklyChartInstance) {
    weeklyChartInstance.destroy()
  }

  const labels = weeklyRows.value.map(
    w => new Date(w.weekStart).toLocaleDateString()
  )

  const workoutsData = weeklyRows.value.map(w => w.workouts)
  const minutesData = weeklyRows.value.map(w => w.minutes)

  weeklyChartInstance = new Chart(weeklyChartRef.value.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Entrenos / semana',
          data: workoutsData,
          tension: 0.3
        },
        {
          label: 'Minutos / semana',
          data: minutesData,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#e5e7eb'
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#9ca3af' },
          grid: { color: 'rgba(148,163,184,0.2)' }
        },
        y: {
          ticks: { color: '#9ca3af' },
          grid: { color: 'rgba(148,163,184,0.2)' }
        }
      }
    }
  })
}

const buildMuscleChart = () => {
  if (!muscleChartRef.value || !byMuscle.value.length) return

  if (muscleChartInstance) {
    muscleChartInstance.destroy()
  }

  const labels = byMuscle.value.map(m => m.muscleGroup)
  const dataValues = byMuscle.value.map(m => m.sessions)

  muscleChartInstance = new Chart(muscleChartRef.value.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data: dataValues
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#e5e7eb'
          }
        }
      },
      cutout: '60%'
    }
  })
}

// reconstruye los gráficos cuando cambia la data
watch(overview, async () => {
  await nextTick()
  buildWeeklyChart()
  buildMuscleChart()
})

// ----------------- EXPORTS (sin columna Volumen) -----------------
const exportToExcel = () => {
  if (!weeklyRows.value.length) {
    showToast('No hay datos para exportar.', 'info')
    return
  }

  const header = [
    'Semana (inicio)',
    'Semana (fin)',
    'Entrenos',
    'Minutos',
    'Peso promedio (kg)'
  ]

  const data = weeklyRows.value.map(w => [
    w.weekStart,
    w.weekEnd,
    w.workouts,
    w.minutes,
    w.avgWeight ?? ''
  ])

  const ws = XLSX.utils.aoa_to_sheet([header, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Estadisticas')

  XLSX.writeFile(wb, 'estadisticas-gymsync.xlsx')
}

const exportToPdf = () => {
  if (!weeklyRows.value.length) {
    showToast('No hay datos para exportar.', 'info')
    return
  }

  const doc = new jsPDF()

  doc.setFontSize(14)
  doc.text('Estadísticas de entrenamiento - GymSync', 14, 18)

  const head = [[
    'Semana (inicio)',
    'Semana (fin)',
    'Entrenos',
    'Minutos',
    'Peso promedio (kg)'
  ]]

  const body = weeklyRows.value.map(w => [
    w.weekStart,
    w.weekEnd,
    w.workouts,
    w.minutes,
    w.avgWeight ?? ''
  ])

  autoTable(doc, {
    startY: 24,
    head,
    body
  })

  doc.save('estadisticas-gymsync.pdf')
}

// ----------------- LIFECYCLE -----------------
onMounted(() => {
  loadStats()
})
</script>

<template>
  <main class="stats-page">
    <!-- HEADER TIPO "MIS RUTINAS / MI PROGRESO" -->
    <section class="card-dark mb-4">
      <span class="accent-pill">estadísticas</span>
      <h1 class="mt-2 mb-1">Mis estadísticas</h1>
      <p class="text-muted mb-0">
        Resumen de tu actividad y progreso dentro de GymSync.
      </p>
    </section>

    <section v-if="error" class="stats__error">
      {{ error }}
    </section>

    <section v-else class="stats__content">
      <div v-if="loading" class="text-muted">Cargando estadísticas...</div>

      <div v-else-if="overview" class="stats__grid">
        <!-- KPIs -->
        <div class="stats__cards">
          <div class="stats-card">
            <span class="stats-card__label">Entrenos totales</span>
            <span class="stats-card__value">{{ summary.totalWorkouts ?? 0 }}</span>
          </div>
          <div class="stats-card">
            <span class="stats-card__label">Minutos totales</span>
            <span class="stats-card__value">{{ summary.totalMinutes ?? 0 }}</span>
          </div>
          <div class="stats-card">
            <span class="stats-card__label">Prom. entrenos/sem</span>
            <span class="stats-card__value">
              {{ summary.avgWorkoutsPerWeek?.toFixed?.(1) ?? '0.0' }}
            </span>
          </div>
          <div class="stats-card">
            <span class="stats-card__label">Peso actual (kg)</span>
            <span class="stats-card__value">
              {{ summary.currentWeight ?? '—' }}
            </span>
            <small
              v-if="summary.weightDiffLast30Days !== undefined"
              :class="{
                'stats-card__chip--up': summary.weightDiffLast30Days > 0,
                'stats-card__chip--down': summary.weightDiffLast30Days < 0
              }"
              class="stats-card__chip"
            >
              {{ summary.weightDiffLast30Days > 0 ? '+' : '' }}
              {{ summary.weightDiffLast30Days }} kg (30 días)
            </small>
          </div>
        </div>

        <!-- Gráficos -->
        <div class="stats__charts">
          <div class="stats__card">
            <h2>Actividad semanal</h2>
            <canvas ref="weeklyChartRef" height="120" />
          </div>

          <div class="stats__card">
            <h2>Distribución por grupo muscular</h2>
            <canvas ref="muscleChartRef" height="120" />
          </div>
        </div>

        <!-- Tabla + export -->
        <div class="stats__card stats__table-card">
          <div class="stats__table-header">
            <h2>Detalle semanal</h2>
            <div class="stats__export-buttons">
              <button class="pill-btn" type="button" @click="exportToExcel">
                Exportar Excel
              </button>
              <button class="pill-btn pill-btn--outline" type="button" @click="exportToPdf">
                Exportar PDF
              </button>
            </div>
          </div>

          <table class="stats-table" v-if="weeklyRows.length">
            <thead>
              <tr>
                <th>Semana (inicio)</th>
                <th>Semana (fin)</th>
                <th>Entrenos</th>
                <th>Minutos</th>
                <th>Peso promedio (kg)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in weeklyRows" :key="w.weekStart">
                <td>{{ new Date(w.weekStart).toLocaleDateString() }}</td>
                <td>{{ new Date(w.weekEnd).toLocaleDateString() }}</td>
                <td>{{ w.workouts }}</td>
                <td>{{ w.minutes }}</td>
                <td>{{ w.avgWeight ?? '—' }}</td>
              </tr>
            </tbody>
          </table>

          <p v-else class="text-muted">
            No hay datos semanales para mostrar.
          </p>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.stats-page {
  padding: 2rem 2.5rem;
  color: var(--color-text);
}

.stats__error {
  margin-top: 0.75rem;
  color: #f97373;
  font-size: 0.9rem;
}

.stats__content {
  margin-top: 1rem;
}

.stats__grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* KPIs */
.stats__cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.stats-card {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 1rem;
  padding: 1rem 1.1rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.9);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stats-card__label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.stats-card__value {
  font-size: 1.3rem;
  font-weight: 600;
}

.stats-card__chip {
  margin-top: 0.3rem;
  padding: 0.1rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem;
  border: 1px solid rgba(148, 163, 184, 0.4);
}

.stats-card__chip--up {
  border-color: #22c55e;
  color: #4ade80;
}

.stats-card__chip--down {
  border-color: #ef4444;
  color: #f97373;
}

/* Gráficos */
.stats__charts {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 1rem;
}

.stats__card {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 1rem;
  padding: 1.2rem 1.3rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.9);
}

.stats__card h2 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

/* Tabla */
.stats__table-card {
  margin-top: 0.5rem;
}

.stats__table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.9rem;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.stats-table th,
.stats-table td {
  padding: 0.5rem 0.4rem;
  text-align: left;
}

.stats-table thead {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.stats-table tbody tr:nth-child(odd) {
  background: rgba(15, 23, 42, 0.7);
}

/* Botones */
.pill-btn {
  border: none;
  border-radius: 999px;
  padding: 0.4rem 1.1rem;
  font-size: 0.8rem;
  cursor: pointer;
  background: linear-gradient(135deg, #22d3ee, #6366f1);
  color: #0b1020;
  font-weight: 600;
}

.pill-btn--outline {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.4);
  color: var(--color-text-muted);
}

/* Otros */
.text-muted {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

@media (max-width: 1024px) {
  .stats__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .stats__charts {
    grid-template-columns: 1fr;
  }
}
</style>
