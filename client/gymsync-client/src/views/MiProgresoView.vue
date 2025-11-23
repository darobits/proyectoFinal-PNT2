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
const progressEntries = ref([]) // viene directo de /api/progress/user/:id

// refs gráficos
const weightChartRef = ref(null)
const minutesChartRef = ref(null)

let weightChartInstance = null
let minutesChartInstance = null

// ---------- FORMULARIO DE PROGRESO MENSUAL ----------
const now = new Date()
const progressForm = reactive({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  weight: null,
  workoutsCount: null,
  minutesTrained: null
})

// ---------- MAPEO A SERIES PARA GRÁFICOS ----------
const weightSeries = computed(() =>
  progressEntries.value
    .filter(e => e.weight != null)
    .sort((a, b) => {
      if (a.year === b.year) return a.month - b.month
      return a.year - b.year
    })
    .map(e => ({
      date: `${e.year}-${String(e.month).padStart(2, '0')}-01`,
      weight: e.weight
    }))
)

const workoutSeries = computed(() =>
  progressEntries.value
    .slice()
    .sort((a, b) => {
      if (a.year === b.year) return a.month - b.month
      return a.year - b.year
    })
    .map(e => ({
      weekStart: `${e.year}-${String(e.month).padStart(2, '0')}-01`,
      workouts: e.workoutsCount ?? 0,
      minutes: e.minutesTrained ?? 0
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

const totalPeriods = computed(() => workoutSeries.value.length)
const periodsWith3Plus = computed(
  () => workoutSeries.value.filter(w => w.workouts >= 3).length
)
const adherencePercent = computed(() =>
  totalPeriods.value
    ? ((periodsWith3Plus.value / totalPeriods.value) * 100).toFixed(1)
    : '0.0'
)

// ---------- CARGA PROGRESO DESDE /api/progress/user/:id ----------
const loadProgress = async () => {
  if (!usuarioActual.value) {
    error.value = 'No hay usuario autenticado.'
    return
  }

  loading.value = true
  error.value = null

  try {
    const userId = usuarioActual.value.id
    const { data } = await api.get(`/progress/user/${userId}`, authConfig.value)
    progressEntries.value = data || []
  } catch (e) {
    console.error('Error cargando progreso:', e.response?.data || e.message)
    error.value = 'No se pudo cargar tu progreso.'
    progressEntries.value = []
  } finally {
    loading.value = false
    await nextTick()
    buildWeightChart()
    buildMinutesChart()
  }
}

// ---------- GUARDAR PROGRESO MENSUAL ----------
const guardarProgresoMensual = async () => {
  if (!usuarioActual.value) {
    showToast('Tenés que iniciar sesión.', 'error')
    return
  }

  const userId = usuarioActual.value.id
  const { year, month, weight, workoutsCount, minutesTrained } = progressForm

  if (!year || !month) {
    showToast('Año y mes son obligatorios.', 'error')
    return
  }

  try {
    await api.post(
      `/progress/user/${userId}`,
      {
        year: Number(year),
        month: Number(month),
        weight: weight !== null && weight !== '' ? Number(weight) : null,
        workoutsCount:
          workoutsCount !== null && workoutsCount !== '' ? Number(workoutsCount) : 0,
        minutesTrained:
          minutesTrained !== null && minutesTrained !== '' ? Number(minutesTrained) : 0
      },
      authConfig.value
    )

    showToast('Progreso mensual guardado correctamente.', 'success')

    await loadProgress()
  } catch (e) {
    console.error('Error guardando progreso mensual:', e.response?.data || e.message)
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

const buildMinutesChart = () => {
  if (!minutesChartRef.value || !workoutSeries.value.length) {
    if (minutesChartInstance) {
      minutesChartInstance.destroy()
      minutesChartInstance = null
    }
    return
  }

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
          label: 'Entrenos / periodo',
          data: workoutsData
        },
        {
          label: 'Minutos / periodo',
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
  <!-- ⚠️ OJO: clase cambiada a progress-page -->
  <main class="progress-page">
    <header class="progress__header">
      <h1>Mi progreso</h1>
      <p>Seguimiento de tu evolución en el tiempo.</p>
    </header>

    <p v-if="error" class="progress__error">
      {{ error }}
    </p>

    <section class="progress__content">
      <div v-if="loading" class="text-muted">Cargando progreso...</div>

      <div v-else class="progress__grid">
        <!-- FORMULARIO PROGRESO -->
        <div class="progress__card progress__form-card">
          <h2>Actualizar progreso mensual</h2>
          <p class="progress__form-help">
            Estos datos alimentan tus estadísticas y gráficos. Podés registrar un mes nuevo
            o actualizar uno existente.
          </p>

          <form class="progress-form" @submit.prevent="guardarProgresoMensual">
            <div class="progress-form__row">
              <div>
                <label>Año</label>
                <input v-model.number="progressForm.year" type="number" min="2000" />
              </div>
              <div>
                <label>Mes</label>
                <select v-model.number="progressForm.month">
                  <option v-for="m in 12" :key="m" :value="m">
                    {{ m }}
                  </option>
                </select>
              </div>
              <div>
                <label>Peso (kg)</label>
                <input v-model.number="progressForm.weight" type="number" step="0.1" />
              </div>
            </div>

            <div class="progress-form__row">
              <div>
                <label>Entrenos en el mes</label>
                <input v-model.number="progressForm.workoutsCount" type="number" min="0" />
              </div>
              <div>
                <label>Minutos entrenados</label>
                <input v-model.number="progressForm.minutesTrained" type="number" min="0" />
              </div>
              <div class="progress-form__actions">
                <button class="primary-btn" type="submit">
                  Guardar progreso
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- SECCIONES SOLO SI HAY PROGRESO -->
        <div class="progress__sections">
          <div v-if="progressEntries.length" class="progress__cards">
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
                Periodos con 3+ entrenos: {{ periodsWith3Plus }}/{{ totalPeriods }}
              </small>
            </div>
          </div>

          <div v-if="progressEntries.length" class="progress__charts">
            <div class="progress__card">
              <h2>Evolución del peso corporal</h2>
              <canvas ref="weightChartRef" height="120" />
            </div>

            <div class="progress__card">
              <h2>Actividad por periodo</h2>
              <canvas ref="minutesChartRef" height="120" />
            </div>
          </div>

          <div class="progress__card progress__timeline">
            <h2>Resumen por periodo</h2>
            <ul v-if="workoutSeries.length" class="timeline-list">
              <li v-for="w in workoutSeries" :key="w.weekStart" class="timeline-item">
                <div class="timeline-item__date">
                  Periodo {{ new Date(w.weekStart).toLocaleDateString() }}
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
              Todavía no registraste progreso. Completá el formulario de arriba para empezar.
            </p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* nombre cambiado: progress-page */
.progress-page {
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

.progress__error {
  margin-top: 0.75rem;
  color: #f97373;
  font-size: 0.9rem;
}

.progress__content {
  margin-top: 2rem;
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
  margin-bottom: 0.7rem;
}

.progress-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.progress-form__row {
  display: flex;
  gap: 0.75rem;
}

.progress-form__row > div {
  flex: 1;
}

.progress-form label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  display: block;
  margin-bottom: 0.2rem;
}

.progress-form input,
.progress-form select {
  width: 100%;
  border-radius: 0.6rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.9);
  padding: 0.45rem 0.7rem;
  font-size: 0.85rem;
  color: var(--color-text);
}

.progress-form__actions {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
}

.primary-btn {
  border-radius: 999px;
  padding: 0.45rem 1.2rem;
  font-size: 0.85rem;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #22d3ee, #0ea5e9);
  color: #020617;
  font-weight: 600;
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
