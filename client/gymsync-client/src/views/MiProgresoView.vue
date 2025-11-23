<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import axios from 'axios'
import { useToast } from '../composables/useToast'

// Chart.js auto (registra todo solo)
import Chart from 'chart.js/auto'

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

const progress = ref(null)

// refs gráficos
const weightChartRef = ref(null)
const minutesChartRef = ref(null)

let weightChartInstance = null
let minutesChartInstance = null

// -------- MOCK de respaldo --------
const mockProgress = {
  weightProgress: [
    { date: '2025-10-20', weight: 80.0 },
    { date: '2025-10-27', weight: 79.4 },
    { date: '2025-11-03', weight: 79.0 },
    { date: '2025-11-10', weight: 78.6 },
    { date: '2025-11-17', weight: 78.2 }
  ],
  workoutProgress: [
    { weekStart: '2025-10-20', workouts: 3, minutes: 150 },
    { weekStart: '2025-10-27', workouts: 4, minutes: 200 },
    { weekStart: '2025-11-03', workouts: 3, minutes: 165 },
    { weekStart: '2025-11-10', workouts: 4, minutes: 210 },
    { weekStart: '2025-11-17', workouts: 4, minutes: 205 }
  ]
}

// ------------- COMPUTEDS -------------
const weightSeries = computed(() => progress.value?.weightProgress || [])
const workoutSeries = computed(() => progress.value?.workoutProgress || [])

const startWeight = computed(() =>
  weightSeries.value.length ? weightSeries.value[0].weight : null
)
const currentWeight = computed(() =>
  weightSeries.value.length ? weightSeries.value[weightSeries.value.length - 1].weight : null
)
const weightDiff = computed(() =>
  (startWeight.value != null && currentWeight.value != null)
    ? (currentWeight.value - startWeight.value)
    : null
)

const totalWeeks = computed(() => workoutSeries.value.length)
const weeksWith3Plus = computed(
  () => workoutSeries.value.filter(w => w.workouts >= 3).length
)
const adherencePercent = computed(() =>
  totalWeeks.value
    ? ((weeksWith3Plus.value / totalWeeks.value) * 100).toFixed(1)
    : '0.0'
)

// ------------- CARGA -----------------
const loadProgress = async () => {
  loading.value = true
  error.value = null

  try {
    const { data } = await api.get('/stats/progress', authConfig.value)
    progress.value = data
  } catch (e) {
    console.error('Error cargando progreso, usando mock:', e.response?.data || e.message)
    progress.value = mockProgress
    showToast('No se pudo cargar /stats/progress, mostrando datos de ejemplo.', 'info')
  } finally {
    loading.value = false
    // esperamos a que se pinte el template y existan los canvas
    await nextTick()
    buildWeightChart()
    buildMinutesChart()
  }
}

// ------------- GRÁFICOS ----------------
const buildWeightChart = () => {
  if (!weightChartRef.value || !weightSeries.value.length) return

  if (weightChartInstance) {
    weightChartInstance.destroy()
  }

  const labels = weightSeries.value.map(p =>
    new Date(p.date).toLocaleDateString()
  )
  const dataValues = weightSeries.value.map(p => p.weight)

  weightChartInstance = new Chart(weightChartRef.value.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Peso corporal (kg)',
          data: dataValues,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: '#e5e7eb' }
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

const buildMinutesChart = () => {
  if (!minutesChartRef.value || !workoutSeries.value.length) return

  if (minutesChartInstance) {
    minutesChartInstance.destroy()
  }

  const labels = workoutSeries.value.map(w =>
    new Date(w.weekStart).toLocaleDateString()
  )
  const workoutsData = workoutSeries.value.map(w => w.workouts)
  const minutesData = workoutSeries.value.map(w => w.minutes)

  minutesChartInstance = new Chart(minutesChartRef.value.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Entrenos / semana',
          data: workoutsData
        },
        {
          label: 'Minutos / semana',
          data: minutesData
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: '#e5e7eb' }
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

// ------------- LIFECYCLE -------------
onMounted(() => {
  loadProgress()
})
</script>

<template>
  <main class="progress">
    <header class="progress__header">
      <h1>Mi progreso</h1>
      <p>Seguimiento de tu evolución en el tiempo.</p>
    </header>

    <section v-if="error" class="progress__error">
      {{ error }}
    </section>

    <section v-else class="progress__content">
      <div v-if="loading" class="text-muted">Cargando progreso...</div>

      <div v-else-if="progress" class="progress__grid">
        <!-- KPIs -->
        <div class="progress__cards">
          <div class="progress-card">
            <span class="progress-card__label">Peso inicial</span>
            <span class="progress-card__value">
              {{ startWeight ?? '—' }} <span v-if="startWeight">kg</span>
            </span>
          </div>
          <div class="progress-card">
            <span class="progress-card__label">Peso actual</span>
            <span class="progress-card__value">
              {{ currentWeight ?? '—' }} <span v-if="currentWeight">kg</span>
            </span>
          </div>
          <div class="progress-card">
            <span class="progress-card__label">Diferencia total</span>
            <span
              class="progress-card__value"
              :class="{
                'progress-card__value--down': weightDiff < 0,
                'progress-card__value--up': weightDiff > 0
              }"
            >
              <template v-if="weightDiff != null">
                {{ weightDiff > 0 ? '+' : '' }}{{ weightDiff.toFixed(1) }} kg
              </template>
              <template v-else>—</template>
            </span>
          </div>
          <div class="progress-card">
            <span class="progress-card__label">Adherencia</span>
            <span class="progress-card__value">
              {{ adherencePercent }} %
            </span>
            <small class="progress-card__sub">
              Semanas con 3+ entrenos: {{ weeksWith3Plus }}/{{ totalWeeks }}
            </small>
          </div>
        </div>

        <!-- Gráficos -->
        <div class="progress__charts">
          <div class="progress__card">
            <h2>Evolución del peso corporal</h2>
            <canvas ref="weightChartRef" height="120" />
          </div>

          <div class="progress__card">
            <h2>Actividad semanal</h2>
            <canvas ref="minutesChartRef" height="120" />
          </div>
        </div>

        <!-- Timeline simple -->
        <div class="progress__card progress__timeline">
          <h2>Resumen por semana</h2>
          <ul v-if="workoutSeries.length" class="timeline-list">
            <li v-for="w in workoutSeries" :key="w.weekStart" class="timeline-item">
              <div class="timeline-item__date">
                Semana del {{ new Date(w.weekStart).toLocaleDateString() }}
              </div>
              <div class="timeline-item__body">
                <p>
                  <strong>{{ w.workouts }}</strong> entrenos –
                  <strong>{{ w.minutes }}</strong> min totales.
                </p>
              </div>
            </li>
          </ul>
          <p v-else class="text-muted">
            Todavía no hay semanas registradas en tu progreso.
          </p>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.progress {
  padding: 2rem 2.5rem;
  color: var(--color-text);
}

.progress__header h1 {
  font-size: 1.7rem;
  margin-bottom: 0.25rem;
}

.progress__header p {
  margin: 0;
  color: var(--color-text-muted);
}

.progress__content {
  margin-top: 2rem;
}

.progress__grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* KPIs */
.progress__cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.progress-card {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 1rem;
  padding: 1rem 1.1rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.9);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.progress-card__label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.progress-card__value {
  font-size: 1.3rem;
  font-weight: 600;
}

.progress-card__value--down {
  color: #4ade80;
}

.progress-card__value--up {
  color: #f97373;
}

.progress-card__sub {
  margin-top: 0.2rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Gráficos */
.progress__charts {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 1rem;
}

.progress__card {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 1rem;
  padding: 1.2rem 1.3rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.9);
}

.progress__card h2 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

/* Timeline */
.progress__timeline {
  margin-top: 0.5rem;
}

.timeline-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.timeline-item {
  border-left: 2px solid rgba(148, 163, 184, 0.4);
  padding-left: 0.9rem;
  margin-left: 0.3rem;
  margin-bottom: 0.75rem;
  position: relative;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 4px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, #22d3ee, #6366f1);
}

.timeline-item__date {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-bottom: 0.15rem;
}

.timeline-item__body {
  font-size: 0.9rem;
}

/* Otros */
.text-muted {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

@media (max-width: 1024px) {
  .progress__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .progress__charts {
    grid-template-columns: 1fr;
  }
}
</style>
