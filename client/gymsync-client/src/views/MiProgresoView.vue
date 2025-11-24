<!-- src/views/MiProgresoView.vue -->
<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import axios from 'axios'
import Chart from 'chart.js/auto'
import { useToast } from '../composables/useToast'

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

const usuarioActual = computed(() => store.state.auth.usuarioActual)

const loading = ref(false)
const error = ref(null)

// colecciones separadas
const dailyEntries = ref([])
const weeklyEntries = ref([])
const monthlyEntries = ref([])

// refs gráficos
const weightChartRef = ref(null)
const weeklyChartRef = ref(null)

let weightChartInstance = null
let weeklyChartInstance = null

// ---------- FORMULARIO DE PROGRESO DIARIO ----------
const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

const dailyForm = reactive({
  date: today,
  weight: null,
  workoutsCount: null,
  minutesTrained: null,
  muscleGroupsText: ''
})

// ---------- SERIES / COMPUTEDS ----------

// daily ordenado
const sortedDaily = computed(() =>
  dailyEntries.value
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
)

// para gráfico de peso
const weightSeries = computed(() =>
  sortedDaily.value
    .filter(d => d.weight != null)
    .map(d => ({
      date: d.date,
      weight: d.weight
    }))
)

const startWeight = computed(() =>
  weightSeries.value.length ? weightSeries.value[0].weight : null
)

const currentWeight = computed(() =>
  weightSeries.value.length
    ? weightSeries.value[weightSeries.value.length - 1].weight
    : null
)

const weightDiff = computed(() =>
  startWeight.value != null && currentWeight.value != null
    ? currentWeight.value - startWeight.value
    : null
)

// weekly para adherencia + gráfico
const weeklySeries = computed(() =>
  weeklyEntries.value
    .slice()
    .sort((a, b) => {
      if (a.year === b.year) return a.week - b.week
      return a.year - b.year
    })
    .map(w => ({
      weekStart: w.weekStart,
      weekEnd: w.weekEnd,
      workouts: w.workoutsCount ?? 0,
      minutes: w.minutesTrained ?? 0
    }))
)

const totalWeeks = computed(() => weeklySeries.value.length)
const weeksWith3Plus = computed(
  () => weeklySeries.value.filter(w => w.workouts >= 3).length
)
const adherencePercent = computed(() =>
  totalWeeks.value
    ? ((weeksWith3Plus.value / totalWeeks.value) * 100).toFixed(1)
    : '0.0'
)

// timeline mensual
const monthlyTimeline = computed(() =>
  monthlyEntries.value
    .slice()
    .sort((a, b) => {
      if (a.year === b.year) return a.month - b.month
      return a.year - b.year
    })
)

// ---------- CARGAR PROGRESO (daily / weekly / monthly) ----------
const loadProgress = async () => {
  if (!usuarioActual.value) {
    error.value = 'No hay usuario autenticado.'
    return
  }

  loading.value = true
  error.value = null

  try {
    const userId = usuarioActual.value.id

    const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
      api.get(`/progress/daily/${userId}`, authConfig.value),
      api.get(`/progress/weekly/${userId}`, authConfig.value),
      api.get(`/progress/monthly/${userId}`, authConfig.value)
    ])

    dailyEntries.value = dailyRes.data || []
    weeklyEntries.value = weeklyRes.data || []
    monthlyEntries.value = monthlyRes.data || []
  } catch (e) {
    console.error('Error cargando progreso:', e.response?.data || e.message)
    error.value = 'No se pudo cargar tu progreso.'
    dailyEntries.value = []
    weeklyEntries.value = []
    monthlyEntries.value = []
  } finally {
    loading.value = false
    await nextTick()
    buildWeightChart()
    buildWeeklyChart()
  }
}

// ---------- GUARDAR PROGRESO DIARIO ----------
const guardarProgresoDiario = async () => {
  if (!usuarioActual.value) {
    showToast('Tenés que iniciar sesión.', 'error')
    return
  }

  const userId = usuarioActual.value.id
  const { date, weight, workoutsCount, minutesTrained, muscleGroupsText } = dailyForm

  if (!date) {
    showToast('La fecha es obligatoria.', 'error')
    return
  }

  const muscleGroups = muscleGroupsText
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  try {
    await api.post(
      `/progress/daily/${userId}`,
      {
        date,
        weight: weight !== null && weight !== '' ? Number(weight) : null,
        workoutsCount:
          workoutsCount !== null && workoutsCount !== ''
            ? Number(workoutsCount)
            : 0,
        minutesTrained:
          minutesTrained !== null && minutesTrained !== ''
            ? Number(minutesTrained)
            : 0,
        muscleGroups
      },
      authConfig.value
    )

    showToast('Progreso diario guardado correctamente.', 'success')
    await loadProgress()
  } catch (e) {
    console.error('Error guardando progreso diario:', e.response?.data || e.message)
    showToast('No se pudo guardar el progreso.', 'error')
  }
}

// ---------- GRÁFICOS ----------
const buildWeightChart = () => {
  if (!weightChartRef.value || !weightSeries.value.length) {
    if (weightChartInstance) {
      weightChartInstance.destroy()
      weightChartInstance = null
    }
    return
  }

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

const buildWeeklyChart = () => {
  if (!weeklyChartRef.value || !weeklySeries.value.length) {
    if (weeklyChartInstance) {
      weeklyChartInstance.destroy()
      weeklyChartInstance = null
    }
    return
  }

  if (weeklyChartInstance) {
    weeklyChartInstance.destroy()
  }

  const labels = weeklySeries.value.map(w =>
    new Date(w.weekStart).toLocaleDateString()
  )
  const workoutsData = weeklySeries.value.map(w => w.workouts)
  const minutesData = weeklySeries.value.map(w => w.minutes)

  weeklyChartInstance = new Chart(weeklyChartRef.value.getContext('2d'), {
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

onMounted(() => {
  loadProgress()
})
</script>

<template>
  <main class="progress-page">
    <!-- HEADER TIPO "MIS RUTINAS" -->
    <section class="card-dark mb-4">
      <span class="accent-pill">progreso</span>
      <h1 class="mt-2 mb-1">Mi progreso</h1>
      <p class="text-muted mb-0">
        Registro diario y resumen semanal / mensual para seguir tu evolución en GymSync.
      </p>
    </section>

    <p v-if="error" class="progress__error">
      {{ error }}
    </p>

    <section class="progress__content">
      <div v-if="loading" class="text-muted">Cargando progreso...</div>

      <div v-else class="progress__grid">
        <!-- FORMULARIO PROGRESO DIARIO -->
        <div class="progress__card progress__form-card">
          <h2>Registrar progreso diario</h2>
          <p class="progress__form-help">
            Guardá tu peso, entrenos y minutos de un día. A partir de esto se calculan tus
            semanas y meses.
          </p>

          <form class="progress-form" @submit.prevent="guardarProgresoDiario">
            <div class="progress-form__row">
              <div class="progress-form__field">
                <label>Fecha</label>
                <input
                  v-model="dailyForm.date"
                  type="date"
                />
              </div>

              <div class="progress-form__field">
                <label>Peso (kg)</label>
                <input
                  v-model.number="dailyForm.weight"
                  type="number"
                  step="0.1"
                  placeholder="Ingresá tu peso actual en kg"
                />
              </div>

              <div class="progress-form__field">
                <label>Entrenos ese día</label>
                <input
                  v-model.number="dailyForm.workoutsCount"
                  type="number"
                  min="0"
                  placeholder="¿Cuántos entrenos hiciste hoy?"
                />
              </div>
            </div>

            <div class="progress-form__row">
              <div class="progress-form__field">
                <label>Minutos entrenados</label>
                <input
                  v-model.number="dailyForm.minutesTrained"
                  type="number"
                  min="0"
                  placeholder="Total de minutos entrenando en el día"
                />
              </div>

              <div class="progress-form__field">
                <label>Grupos musculares</label>
                <input
                  v-model="dailyForm.muscleGroupsText"
                  type="text"
                  placeholder="Pecho, espalda, piernas, bíceps..."
                />
              </div>

              <div class="progress-form__actions">
                <button class="primary-btn" type="submit">
                  Guardar día
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- SECCIONES SI HAY DATA -->
        <div class="progress__sections">
          <div v-if="sortedDaily.length || weeklySeries.length" class="progress__cards">
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
              <span class="progress-card__label">Adherencia semanal</span>
              <span class="progress-card__value">
                {{ adherencePercent }} %
              </span>
              <small class="progress-card__sub">
                Semanas con 3+ entrenos: {{ weeksWith3Plus }}/{{ totalWeeks }}
              </small>
            </div>
          </div>

          <div v-if="sortedDaily.length || weeklySeries.length" class="progress__charts">
            <div class="progress__card">
              <h2>Evolución del peso corporal</h2>
              <canvas ref="weightChartRef" height="120" />
            </div>

            <div class="progress__card">
              <h2>Actividad semanal</h2>
              <canvas ref="weeklyChartRef" height="120" />
            </div>
          </div>

          <div class="progress__card progress__timeline">
            <h2>Resumen mensual</h2>
            <ul v-if="monthlyTimeline.length" class="timeline-list">
              <li
                v-for="m in monthlyTimeline"
                :key="m.year + '-' + m.month"
                class="timeline-item"
              >
                <div class="timeline-item__date">
                  {{ m.year }} – Mes {{ m.month }}
                </div>
                <div class="timeline-item__body">
                  <p>
                    <strong>{{ m.workoutsCount }}</strong> entrenos –
                    <strong>{{ m.minutesTrained }}</strong> min.
                    <span v-if="m.weight != null">
                      | peso fin de mes: {{ m.weight }} kg
                    </span>
                  </p>
                </div>
              </li>
            </ul>
            <p v-else class="text-muted">
              Todavía no registraste progreso. Guardá un día para empezar.
            </p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.progress-page {
  padding: 2rem 2.5rem;
  color: var(--color-text);
}

.progress__error {
  margin-top: 0.75rem;
  color: #f97373;
  font-size: 0.9rem;
}

.progress__content {
  margin-top: 1rem;
}

.progress__grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* TARJETA FORMULARIO */
.progress__form-card {
  margin-bottom: 0.5rem;
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

.progress__form-help {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 0.9rem;
}

/* === FORM HORIZONTAL CON PLACEHOLDERS CLAROS === */
.progress-form {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.progress-form__row {
  display: flex;
  gap: 0.75rem;
}

.progress-form__field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.progress-form__field label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.progress-form input,
.progress-form select {
  width: 100%;
  border-radius: 0.7rem;
  background:rgba(54, 64, 85, 0.95);; /* un poco más oscuro que blanco puro */
  color: #111827;
  border: 1px solid #d1d5db;
  padding: 0.5rem 0.8rem;
  font-size: 0.88rem;
}

.progress-form input::placeholder {
  color: #6b7280;
}

.progress-form input:focus,
.progress-form select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.35);
}

.progress-form__actions {
  margin-top: 0.4rem;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
}

.primary-btn {
  border-radius: 999px;
  padding: 0.55rem 1.4rem;
  font-size: 0.9rem;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #22d3ee, #0ea5e9);
  color: #020617;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.9);
}

/* CONTENIDO PRINCIPAL */
.progress__sections {
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
  .progress-form__row {
    flex-direction: column;
  }
}
</style>
