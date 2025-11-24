<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import axios from 'axios'

// ─────────────────────────────
// STORE Y USUARIO
// ─────────────────────────────
const store = useStore()
const usuario = computed(() => store.state.auth.usuarioActual)
const token = computed(() => store.state.auth.token)
const esAdmin = computed(() => store.getters['auth/rolActual'] === 'ADMIN')

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

// ─────────────────────────────
// ESTADO
// ─────────────────────────────
const loading = ref(true)
const summary = ref(null)
const byWeek = ref([])
const byMuscle = ref([])
const suggestions = ref([])

// últimas semanas para el gráfico (máx 6)
const lastWeeks = computed(() => {
  if (!byWeek.value || byWeek.value.length === 0) return []
  const size = 6
  return byWeek.value.slice(-size)
})

// máximo de entrenos para escalar la barra
const maxWorkouts = computed(() => {
  if (!lastWeeks.value.length) return 0
  return lastWeeks.value.reduce(
    (max, w) => Math.max(max, w.workouts || 0),
    0
  )
})

// grupo muscular más / menos entrenado
const topMuscle = computed(() => {
  if (!byMuscle.value || byMuscle.value.length === 0) return null
  return byMuscle.value.reduce((max, m) =>
    m.sessions > max.sessions ? m : max
  )
})

const bottomMuscle = computed(() => {
  if (!byMuscle.value || byMuscle.value.length === 0) return null
  return byMuscle.value.reduce((min, m) =>
    m.sessions < min.sessions ? m : min
  )
})

// ─────────────────────────────
// CARGAR DATOS
// ─────────────────────────────
async function loadStats () {
  try {
    const { data } = await api.get('/stats/overview', {
      headers: { Authorization: `Bearer ${token.value}` }
    })

    summary.value = data.summary
    byWeek.value = data.byWeek
    byMuscle.value = data.byMuscleGroup

    buildSuggestions()
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

// ─────────────────────────────
// SUGERENCIAS
// ─────────────────────────────
function buildSuggestions () {
  if (!summary.value) return

  const sug = []

  // poco entrenamiento en general
  if (summary.value.totalWorkouts < 4) {
    sug.push('💤 Semana muy tranquila… podrías sumar aunque sea 1 sesión más.')
  }

  // diferencia de peso
  if (summary.value.weightDiffLast30Days !== null) {
    const diff = summary.value.weightDiffLast30Days
    if (diff > 1) {
      sug.push('⚖️ Aumentaste de peso este mes. Revisá tu progreso para ver tendencias.')
    } else if (diff < -1) {
      sug.push('✅ Bajaste de peso en los últimos 30 días. ¡Gran avance!')
    }
  }

  // semana actual sin entrenos
  if (byWeek.value.length > 0) {
    const last = byWeek.value[byWeek.value.length - 1]
    if (last.workouts === 0) {
      sug.push('🚀 Todavía no registraste entrenos esta semana. Un día es un buen momento para empezar.')
    }
  }

  // sugerencias por grupo muscular
  if (topMuscle.value) {
    const top = topMuscle.value
    sug.push(
      `🔥 Estás trabajando mucho ${top.muscleGroup} (${top.sessions} sesiones). ` +
      'Podés ajustar o crear una rutina específica en "Mis rutinas" o inspirarte en "Descubrir".'
    )
  }

  // desequilibrio entre grupos
  if (
    topMuscle.value &&
    bottomMuscle.value &&
    topMuscle.value.muscleGroup !== bottomMuscle.value.muscleGroup
  ) {
    const diffSessions = topMuscle.value.sessions - bottomMuscle.value.sessions
    if (diffSessions >= 3) {
      sug.push(
        `⚠️ Hay bastante diferencia entre ${topMuscle.value.muscleGroup} y ` +
        `${bottomMuscle.value.muscleGroup}. Quizás te convenga sumar alguna rutina que incluya más ` +
        `${bottomMuscle.value.muscleGroup} para equilibrar.`
      )
    }
  }

  if (sug.length === 0) {
    sug.push('👌 Todo en equilibrio. Seguí así.')
  }

  suggestions.value = sug
}

// ─────────────────────────────
// MONTADO
// ─────────────────────────────
onMounted(() => {
  loadStats()
})
</script>

<template>
  <section>
    <!-- HEADER -->
    <div class="card-dark mb-4">
      <span class="accent-pill">dashboard</span>
      <h1 class="mt-2 mb-1">Bienvenido, {{ usuario?.name }} 👋</h1>

      <p class="text-muted mb-0">
        {{
          esAdmin
            ? 'Control general del sistema y actividad de usuarios.'
            : 'Tu resumen rápido de actividad, progreso y entrenamientos.'
        }}
      </p>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="text-muted py-5">Cargando...</div>

    <template v-else>
      <!-- KPIs -->
      <div class="row g-3 mb-4">
        <div class="col-md-3 col-6">
          <div class="card-dark h-100 kpi-card">
            <p class="text-muted mb-1">Entrenos totales</p>
            <h2>{{ summary.totalWorkouts }}</h2>
          </div>
        </div>

        <div class="col-md-3 col-6">
          <div class="card-dark h-100 kpi-card">
            <p class="text-muted mb-1">Minutos acumulados</p>
            <h2>{{ summary.totalMinutes }}</h2>
          </div>
        </div>

        <div class="col-md-3 col-6">
          <div class="card-dark h-100 kpi-card">
            <p class="text-muted mb-1">Promedio semanal</p>
            <h2>{{ summary.avgWorkoutsPerWeek }}</h2>
          </div>
        </div>

        <div class="col-md-3 col-6">
          <div class="card-dark h-100 kpi-card">
            <p class="text-muted mb-1">Peso actual</p>
            <h2>{{ summary.currentWeight ?? '—' }}</h2>
          </div>
        </div>
      </div>

      <!-- PANEL + ACCESOS RÁPIDOS (panel primero) -->
      <div class="row g-3 mb-4">
        <div class="col-md-6" v-if="esAdmin">
          <div class="card-dark h-100 panel-card">
            <div class="panel-header">
              <div class="panel-title-wrap">
                <span class="panel-icon">🛠️</span>
                <div>
                  <h3 class="mb-1">Panel administrador</h3>
                  <span class="panel-subtitle">Control de usuarios y rutinas</span>
                </div>
              </div>
              <span class="panel-pill">ADMIN</span>
            </div>

            <p class="text-muted mb-3">
              Gestioná perfiles, revisá rutinas y monitoreá la actividad general del sistema sin salir de GymSync.
            </p>

            <div class="panel-actions">
              <router-link to="/admin/perfiles" class="panel-btn primary">
                Gestionar perfiles
              </router-link>
              <router-link to="/estadisticas" class="panel-btn ghost">
                Ver estadísticas globales
              </router-link>
            </div>
          </div>
        </div>

        <div class="col-md-6" :class="{ 'col-md-12': !esAdmin }">
          <div class="card-dark h-100 quick-card">
            <h3 class="mb-2">Accesos rápidos</h3>
            <p class="text-muted mb-3">
              Entrá directo a las secciones clave de tu entrenamiento.
            </p>

            <div class="quick-grid">
              <router-link to="/mis-rutinas" class="quick-item">
                <div class="quick-icon">🏋️‍♀️</div>
                <div class="quick-text">
                  <span class="quick-title">Mis rutinas</span>
                  <span class="quick-sub">Crear, editar y organizar tus entrenos</span>
                </div>
              </router-link>

              <router-link to="/mi-progreso" class="quick-item">
                <div class="quick-icon">📅</div>
                <div class="quick-text">
                  <span class="quick-title">Mi progreso</span>
                  <span class="quick-sub">Registrar días y cargas de entrenamiento</span>
                </div>
              </router-link>

              <router-link to="/estadisticas" class="quick-item">
                <div class="quick-icon">📈</div>
                <div class="quick-text">
                  <span class="quick-title">Estadísticas</span>
                  <span class="quick-sub">Ver gráficos y exportar datos</span>
                </div>
              </router-link>

              <router-link to="/comunidad" class="quick-item">
                <div class="quick-icon">🤝</div>
                <div class="quick-text">
                  <span class="quick-title">Comunidad</span>
                  <span class="quick-sub">Amigos, solicitudes y mensajes</span>
                </div>
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- SUGERENCIAS (debajo de panel + accesos rápidos) -->
      <div class="card-dark mb-4 suggestions-card">
        <h3 class="mb-2">Sugerencias para vos</h3>

        <p class="text-muted small mb-3">
          Tips generados según tu actividad, peso y grupos musculares más trabajados.
        </p>

        <ul class="suggestion-list">
          <li v-for="(s, i) in suggestions" :key="i" class="suggestion-item">
            <span class="suggestion-dot"></span>
            <span class="suggestion-text">{{ s }}</span>
          </li>
        </ul>
      </div>

      <!-- ACTIVIDAD SEMANAL (como la tenías) -->
      <div class="card-dark mb-4">
        <div class="section-header">
          <h3 class="mb-1">Actividad semanal</h3>
          <span v-if="lastWeeks.length" class="section-caption">
            Últimas {{ lastWeeks.length }} semanas
          </span>
        </div>

        <div v-if="lastWeeks.length === 0" class="text-muted py-3">
          Todavía no registraste actividad semanal.
        </div>

        <div v-else class="week-grid">
          <div
            v-for="week in lastWeeks"
            :key="week.weekStart"
            class="week-card"
          >
            <div class="week-main">
              <div class="week-dates">
                Semana {{ week.weekStart.slice(5, 10) }} → {{ week.weekEnd.slice(5, 10) }}
              </div>

              <div class="week-badges">
                <span class="badge-small badge-workouts">
                  {{ week.workouts }} {{ week.workouts === 1 ? 'entreno' : 'entrenos' }}
                </span>
                <span class="badge-small badge-minutes">
                  {{ week.minutes }} min
                </span>
                <span
                  v-if="week.avgWeight !== null && week.avgWeight !== undefined"
                  class="badge-small badge-weight"
                >
                  {{ week.avgWeight }} kg promedio
                </span>
              </div>
            </div>

            <div class="week-progress">
              <div
                class="week-progress-bar"
                :style="{
                  width:
                    maxWorkouts === 0
                      ? '10%'
                      : (Math.max(week.workouts, 0.5) / maxWorkouts) * 100 + '%'
                }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- MUSCULARES -->
      <div class="card-dark mb-4">
        <h3 class="mb-2">Grupos musculares más entrenados</h3>

        <p v-if="byMuscle.length === 0" class="text-muted">
          No registraste grupos musculares todavía.
        </p>

        <ul v-else class="text-muted muscle-list">
          <li v-for="m in byMuscle" :key="m.muscleGroup">
            <span class="muscle-name">{{ m.muscleGroup }}</span>
            <span class="muscle-sessions">{{ m.sessions }} sesiones</span>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.kpi-card h2 {
  font-size: 1.7rem;
}

/* PANEL ADMIN + ACCESOS RÁPIDOS */
.panel-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.panel-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.panel-icon {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
}

.panel-subtitle {
  font-size: 0.8rem;
  color: #9ca3af;
}

.panel-pill {
  font-size: 0.7rem;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.08);
  color: #e5e7eb;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.panel-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  font-size: 0.85rem;
  text-decoration: none;
  border: 1px solid transparent;
}

.panel-btn.primary {
  background: #22c55e;
  color: #022c22;
  border-color: #22c55e;
}

.panel-btn.ghost {
  background: transparent;
  color: #e5e7eb;
  border-color: rgba(148, 163, 184, 0.4);
}

/* QUICK LINKS */
.quick-card {
  display: flex;
  flex-direction: column;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.quick-item {
  display: flex;
  gap: 0.6rem;
  padding: 0.65rem 0.75rem;
  border-radius: 0.75rem;
  text-decoration: none;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.quick-item:hover {
  border-color: #22c55e;
}

.quick-icon {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.quick-text {
  display: flex;
  flex-direction: column;
}

.quick-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e5e7eb;
}

.quick-sub {
  font-size: 0.8rem;
  color: #9ca3af;
}

/* Header sección actividad */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.section-caption {
  font-size: 0.8rem;
  color: #9ca3af;
}

/* GRID DE SEMANAS */
.week-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}

.week-card {
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.1);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.week-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.week-dates {
  font-weight: 600;
  color: #e5e7eb;
}

/* BADGES */
.week-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.badge-small {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.badge-workouts {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.badge-minutes {
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
}

.badge-weight {
  background: rgba(244, 114, 182, 0.1);
  color: #f472b6;
}

/* PROGRESS BAR */
.week-progress {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 1);
  overflow: hidden;
}

.week-progress-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #22c55e, #4ade80);
  transition: width 0.35s ease;
}

/* MUSCLES LIST */
.muscle-list {
  list-style: none;
  padding-left: 0;
  margin: 0;
}

.muscle-list li {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.muscle-list li:last-child {
  border-bottom: none;
}

.muscle-name {
  font-weight: 500;
}

.muscle-sessions {
  font-size: 0.85rem;
  color: #9ca3af;
}

/* SUGERENCIAS */
.suggestions-card {
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.suggestion-list {
  list-style: none;
  padding-left: 0;
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
}

.suggestion-dot {
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 999px;
  background: #22c55e;
}

.suggestion-text {
  font-size: 0.9rem;
  color: #e5e7eb;
}
</style>
