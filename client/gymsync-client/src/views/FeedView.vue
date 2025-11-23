<script setup>
import { computed, ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import { RouterLink } from 'vue-router'
import axios from 'axios'
import { useToast } from '../composables/useToast'

const store = useStore()
const { showToast } = useToast()

const usuario = computed(() => store.state.auth.usuarioActual)
const esAdmin = computed(() => store.getters['auth/rolActual'] === 'ADMIN')
const token = computed(() => store.state.auth.token)

const authConfig = computed(() => ({
  headers: {
    Authorization: `Bearer ${token.value}`
  }
}))

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

const nombre = computed(() => usuario.value?.name || 'Usuario')

// --------- DATOS DE PERFIL ---------
const pesoActual = computed(() => usuario.value?.currentWeight ?? null)
const alturaCm = computed(() => usuario.value?.height ?? null)

const alturaM = computed(() => {
  if (!alturaCm.value) return null
  return alturaCm.value / 100
})

const imc = computed(() => {
  if (!pesoActual.value || !alturaM.value) return null
  const valor = pesoActual.value / (alturaM.value * alturaM.value)
  return valor.toFixed(1)
})

const totalCamposPerfil = 4
const camposPerfilCompletos = computed(() => {
  if (!usuario.value) return 0
  let c = 0
  if (usuario.value.age) c++
  if (usuario.value.height) c++
  if (usuario.value.currentWeight) c++
  if (usuario.value.goal) c++
  return c
})
const perfilCompleto = computed(() => camposPerfilCompletos.value === totalCamposPerfil)

// --------- MÉTRICAS REMOTAS ---------
const adminMetrics = ref({
  totalUsers: null,
  admins: null,
  standardUsers: null,
  totalRoutines: null
})

const userMetrics = ref({
  friends: null
})

onMounted(async () => {
  if (!usuario.value) return

  try {
    if (esAdmin.value) {
      // Admin: conteos básicos del sistema
      const [usersRes, routinesRes] = await Promise.all([
        api.get('/users', authConfig.value),
        api.get('/routines', authConfig.value)
      ])

      const users = usersRes.data || []
      const routines = routinesRes.data || []

      adminMetrics.value.totalUsers = users.length
      adminMetrics.value.admins = users.filter(u => u.role === 'ADMIN').length
      adminMetrics.value.standardUsers = users.filter(u => u.role !== 'ADMIN').length
      adminMetrics.value.totalRoutines = routines.length
    } else {
      // Usuario normal: cantidad de amigos en comunidad
      const { data } = await api.get('/social/friends', {
        ...authConfig.value,
        params: { userId: usuario.value.id }
      })
      userMetrics.value.friends = (data || []).length
    }
  } catch (error) {
    console.error(error)
    showToast('No se pudieron cargar todas las métricas del inicio', 'error')
  }
})

// --------- KPIs CABECERA ---------
const kpis = computed(() => {
  if (esAdmin.value) {
    return [
      {
        label: 'Usuarios totales',
        value: adminMetrics.value.totalUsers ?? '—',
        desc: 'Todos los usuarios registrados.'
      },
      {
        label: 'Admins',
        value: adminMetrics.value.admins ?? '—',
        desc: 'Cuentas con rol ADMIN.'
      },
      {
        label: 'Usuarios estándar',
        value: adminMetrics.value.standardUsers ?? '—',
        desc: 'Usuarios con rol USER / otros.'
      },
      {
        label: 'Rutinas cargadas',
        value: adminMetrics.value.totalRoutines ?? '—',
        desc: 'Todas las rutinas del sistema.'
      }
    ]
  }

  return [
    {
      label: 'Amigos en GymSync',
      value: userMetrics.value.friends ?? '—',
      desc: 'Conectados en la sección Comunidad.'
    },
    {
      label: 'Perfil completo',
      value: perfilCompleto.value
        ? 'Sí'
        : `${camposPerfilCompletos.value}/${totalCamposPerfil}`,
      desc: 'Cuantos datos básicos cargaste.'
    },
    {
      label: 'IMC estimado',
      value: imc.value || '—',
      desc: imc.value
        ? 'Calculado con tu peso y altura.'
        : 'Faltan datos para calcularlo.'
    },
    {
      label: 'Objetivo actual',
      value: usuario.value?.goal || 'Sin objetivo definido',
      desc: 'Configurado en tu perfil.'
    }
  ]
})

// --------- SUGERENCIAS ---------
const sugerencias = computed(() => {
  const items = []

  if (esAdmin.value) {
    items.push('Revisá los perfiles en Admin > Perfiles y verificá roles y datos.')
    if ((adminMetrics.value.totalRoutines ?? 0) === 0) {
      items.push('Creá algunas rutinas de ejemplo para mostrar en Descubrir.')
    } else {
      items.push('Mirar en Descubrir cuáles rutinas públicas vas a usar en la demo.')
    }
    items.push('Probá exportar estadísticas desde la vista Estadísticas para validar el TP.')
    return items
  }

  // Usuario normal
  if (!perfilCompleto.value) {
    items.push('Completá tu perfil (edad, altura, peso y objetivo) para mejorar las estadísticas.')
  }

  if ((userMetrics.value.friends ?? 0) === 0) {
    items.push('Buscá amigos en Comunidad para compartir rutinas y chatear.')
  }

  items.push('Creá o ajustá una rutina en Mis rutinas para esta semana.')
  items.push('Registrá tu último entrenamiento en Mi progreso y mirá los gráficos en Estadísticas.')

  return items
})
</script>

<template>
  <section>
    <!-- Header -->
    <div class="card-dark mb-4">
      <span class="accent-pill">inicio</span>
      <h1 class="mt-2 mb-1">
        Hola, {{ nombre }} 👋
      </h1>
      <p class="text-muted mb-0">
        Resumen rápido de tu cuenta y accesos directos a lo importante.
      </p>
    </div>

    <!-- KPIs -->
    <div class="row g-3 mb-4">
      <div
        v-for="item in kpis"
        :key="item.label"
        class="col-md-3 col-6"
      >
        <div class="card-dark h-100 kpi-card">
          <p class="text-muted mb-1 kpi-label">{{ item.label }}</p>
          <h2 class="mb-0 kpi-value">{{ item.value }}</h2>
          <small class="text-muted">{{ item.desc }}</small>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <!-- Sugerencias -->
      <div class="col-md-6">
        <div class="card-dark h-100">
          <h3 class="mb-2">Sugerencias para hoy</h3>
          <ul class="text-muted suggestions-list">
            <li v-for="(s, idx) in sugerencias" :key="idx">
              {{ s }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Atajos rápidos -->
      <div class="col-md-6">
        <div class="card-dark h-100">
          <h3 class="mb-2">Accesos rápidos</h3>
          <div class="quick-links">
            <RouterLink
              :to="{ name: 'MisRutinas' }"
              class="btn-pill"
            >
              Mis rutinas
            </RouterLink>

            <RouterLink
              :to="{ name: 'MiProgreso' }"
              class="btn-pill"
            >
              Mi progreso
            </RouterLink>

            <RouterLink
              :to="{ name: 'Estadisticas' }"
              class="btn-pill"
            >
              Estadísticas
            </RouterLink>

            <RouterLink
              :to="{ name: 'Descubrir' }"
              class="btn-pill"
            >
              Descubrir rutinas
            </RouterLink>

            <RouterLink
              :to="{ name: 'Friends' }"
              class="btn-pill"
            >
              Comunidad
            </RouterLink>

            <RouterLink
              :to="{ name: 'Perfil' }"
              class="btn-pill secondary"
            >
              Editar perfil
            </RouterLink>

            <RouterLink
              v-if="esAdmin"
              :to="{ name: 'AdminPerfiles' }"
              class="btn-pill admin"
            >
              Admin usuarios
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.kpi-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.kpi-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.kpi-value {
  font-size: 1.7rem;
}

.quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn-pill {
  padding: 0.45rem 0.95rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  text-decoration: none;
  font-size: 0.85rem;
  background: rgba(15, 23, 42, 0.9);
  color: #e5e7eb;
  transition: background 0.15s ease, transform 0.12s ease, border-color 0.15s ease;
}

.btn-pill:hover {
  background: rgba(34, 197, 94, 0.18);
  border-color: #22c55e;
  transform: translateY(-1px);
}

.btn-pill.secondary {
  border-color: rgba(148, 163, 184, 0.6);
  opacity: 0.9;
}

.btn-pill.admin {
  border-color: rgba(248, 250, 252, 0.6);
}

.suggestions-list {
  padding-left: 1.1rem;
  margin-bottom: 0;
}

.suggestions-list li {
  margin-bottom: 0.35rem;
}
</style>
