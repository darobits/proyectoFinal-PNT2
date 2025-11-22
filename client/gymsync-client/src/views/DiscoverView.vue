<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import axios from 'axios'

const store = useStore()

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

const authConfig = computed(() => ({
  headers: {
    Authorization: `Bearer ${store.state.auth.token}`
  }
}))

const cargando = ref(false)
const error = ref('')
const rutinas = ref([])

const usuarioActual = computed(() => store.state.auth.usuarioActual)

const cargarRutinas = async () => {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get('/routines/discover/list', authConfig.value)
    rutinas.value = data
  } catch (e) {
    console.error(e)
    error.value = 'No se pudieron cargar las rutinas.'
  } finally {
    cargando.value = false
  }
}

const toggleLike = async (routine) => {
  try {
    const { data } = await api.post(
      `/routines/${routine.id}/toggle-like`,
      {},
      authConfig.value
    )
    const idx = rutinas.value.findIndex(r => r.id === data.id)
    if (idx !== -1) rutinas.value[idx] = data
  } catch (e) {
    console.error(e)
    alert('No se pudo actualizar el favorito.')
  }
}

const pedirColaboracion = async (routine) => {
  if (!routine.allowCollab) return
  if (!confirm(`¿Pedir colaborar en "${routine.title}"?`)) return
  try {
    const { data } = await api.post(
      `/routines/${routine.id}/request-collab`,
      {},
      authConfig.value
    )
    const idx = rutinas.value.findIndex(r => r.id === data.id)
    if (idx !== -1) rutinas.value[idx] = data
    alert('Solicitud enviada.')
  } catch (e) {
    console.error(e)
    alert(e.response?.data?.error || 'No se pudo enviar la solicitud.')
  }
}

const userLikeCount = (r) => r.likedByIds?.length || 0
const userHasLiked = (r) =>
  Array.isArray(r.likedByIds) &&
  usuarioActual.value &&
  r.likedByIds.includes(usuarioActual.value.id)

onMounted(() => {
  cargarRutinas()
})
</script>

<template>
  <main class="discover">
    <section class="discover__header card-dark">
      <span class="badge">Explorar rutinas</span>
      <h1>Descubrí nuevas rutinas</h1>
      <p class="text-muted">
        Acá podés ver rutinas públicas de otros usuarios, dar favorito y pedir colaborar si el creador lo permite.
      </p>
    </section>

    <section class="discover__content">
      <p v-if="error" class="text-error">{{ error }}</p>
      <p v-else-if="cargando" class="text-muted">Cargando rutinas...</p>

      <div v-else class="discover__grid">
        <div
          v-for="r in rutinas"
          :key="r.id"
          class="routine-card card-dark"
        >
          <header class="routine-card__header">
            <h2>{{ r.title }}</h2>
            <span class="routine-card__pill">{{ r.level || 'Sin nivel' }}</span>
          </header>

          <p class="routine-card__desc">
            {{ r.description || 'Sin descripción.' }}
          </p>

          <p class="routine-card__meta text-muted">
            {{ r.category || 'Sin categoría' }} · Creador #{{ r.creatorId }}
          </p>

          <footer class="routine-card__footer">
            <button
              type="button"
              class="btn-icon"
              @click="toggleLike(r)"
            >
              <span class="icon">
                {{ userHasLiked(r) ? '★' : '☆' }}
              </span>
              <span>{{ userLikeCount(r) }}</span>
            </button>

            <button
              v-if="r.allowCollab"
              type="button"
              class="btn-outline"
              @click="pedirColaboracion(r)"
            >
              Colaborar
            </button>
          </footer>
        </div>

        <p v-if="!rutinas.length && !cargando" class="text-muted">
          No hay rutinas públicas por ahora. Probá crear una y marcarla como pública.
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.discover {
  padding: 2rem 2.5rem;
}

.discover__header {
  margin-bottom: 1.5rem;
}

.badge {
  display: inline-flex;
  padding: 0.18rem 0.7rem;
  border-radius: 999px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.13em;
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  margin-bottom: 0.5rem;
}

.discover__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.discover__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.routine-card {
  padding: 1rem 1.1rem;
  border-radius: 1rem;
}

.routine-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.35rem;
}

.routine-card__pill {
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: rgba(148, 163, 184, 0.15);
  color: var(--color-text-muted);
}

.routine-card__desc {
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.routine-card__meta {
  font-size: 0.78rem;
  margin-bottom: 0.7rem;
}

.routine-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: rgba(15, 23, 42, 0.9);
  color: var(--color-text);
  font-size: 0.85rem;
}

.btn-icon .icon {
  font-size: 1rem;
}

.btn-outline {
  padding: 0.3rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-outline:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.text-muted {
  color: var(--color-text-muted);
}

.text-error {
  color: #f97373;
}
</style>
