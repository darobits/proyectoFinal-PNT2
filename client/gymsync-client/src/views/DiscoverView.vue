<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useStore } from 'vuex'

const store = useStore()

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

const authConfig = computed(() => ({
  headers: {
    Authorization: `Bearer ${store.state.auth.token}`
  }
}))

const usuarioActual = computed(() => store.state.auth.usuarioActual)

const rutinas = ref([])
const cargando = ref(false)
const mensajeOk = ref('')
const mensajeError = ref('')

// 👉 helper para usar el toast global
const showToast = (message, type = 'info') => {
  store.commit('ui/showToast', { message, type })
}

const cargarRutinas = async () => {
  cargando.value = true
  mensajeError.value = ''
  try {
    const { data } = await api.get('/routines/discover/list', authConfig.value)
    rutinas.value = data
  } catch (e) {
    console.error(e)
    mensajeError.value = 'No se pudieron cargar las rutinas públicas.'
    showToast('No se pudieron cargar las rutinas públicas.', 'error')
  } finally {
    cargando.value = false
  }
}

const replaceRoutine = (updated) => {
  const idx = rutinas.value.findIndex(r => r.id === updated.id)
  if (idx !== -1) rutinas.value[idx] = updated
}

const getCollabState = (routine) => {
  const userId = usuarioActual.value?.id
  if (!userId) return 'none'
  if (routine.creatorId === userId) return 'owner'
  if (Array.isArray(routine.collaboratorsIds) && routine.collaboratorsIds.includes(userId)) {
    return 'collab'
  }
  if (Array.isArray(routine.pendingCollabIds) && routine.pendingCollabIds.includes(userId)) {
    return 'pending'
  }
  return 'none'
}

const collabLabel = (routine) => {
  const s = getCollabState(routine)
  if (s === 'owner') return 'Sos el creador'
  if (s === 'collab') return 'Colaborás'
  if (s === 'pending') return 'Pendiente'
  return 'Colaborar'
}

const collabDisabled = (routine) => {
  const s = getCollabState(routine)
  return s === 'owner' || s === 'collab' || s === 'pending'
}

const hasLike = (routine) => {
  const userId = usuarioActual.value?.id
  return (
    !!userId &&
    Array.isArray(routine.likedByIds) &&
    routine.likedByIds.includes(userId)
  )
}

const toggleLike = async (routine) => {
  mensajeOk.value = ''
  mensajeError.value = ''
  try {
    const { data } = await api.post(
      `/routines/${routine.id}/toggle-like`,
      null,
      authConfig.value
    )
    replaceRoutine(data)
    showToast(
      hasLike(data)
        ? 'Marcaste la rutina como favorita.'
        : 'Quitaste la rutina de favoritos.',
      'success'
    )
  } catch (e) {
    console.error(e)
    mensajeError.value = 'No se pudo actualizar el favorito.'
    showToast('No se pudo actualizar el favorito.', 'error')
  }
}

const pedirColaborar = async (routine) => {
  mensajeOk.value = ''
  mensajeError.value = ''

  const state = getCollabState(routine)

  if (state === 'owner') {
    const msg = 'Sos el creador de esta rutina.'
    mensajeOk.value = msg
    showToast(msg, 'info')
    return
  }
  if (state === 'collab') {
    const msg = 'Ya sos colaborador de esta rutina.'
    mensajeOk.value = msg
    showToast(msg, 'success')
    return
  }
  if (state === 'pending') {
    const msg = 'Tu solicitud de colaboración está pendiente.'
    mensajeOk.value = msg
    showToast(msg, 'info')
    return
  }

  try {
    const { data } = await api.post(
      `/routines/${routine.id}/request-collab`,
      null,
      authConfig.value
    )
    replaceRoutine(data)
    const msg = 'Solicitud de colaboración enviada al creador.'
    mensajeOk.value = msg
    showToast(msg, 'success')
  } catch (e) {
    console.error(e)
    const backendMsg = e?.response?.data?.error
    const msg = backendMsg || 'No se pudo enviar la solicitud de colaboración.'
    mensajeError.value = msg
    showToast(msg, 'error')
  }
}

onMounted(() => {
  cargarRutinas()
})
</script>

<template>
  <main class="page">
    <section class="card-dark mb-4">
      <span class="accent-pill">explorar rutinas</span>
      <h1 class="mt-2 mb-1">Descubrí nuevas rutinas</h1>
      <p class="text-muted mb-0">
        Acá podés ver rutinas públicas de otros usuarios, dar favorito y pedir colaborar si el creador lo permite.
      </p>
    </section>

    <section class="card-dark">
      <div class="discover-header">
        <h3 class="mb-0">Rutinas públicas</h3>
        <span v-if="cargando" class="text-muted small">Cargando...</span>
      </div>

      <div class="messages">
        <p v-if="mensajeOk" class="msg msg--ok">{{ mensajeOk }}</p>
        <p v-if="mensajeError" class="msg msg--error">{{ mensajeError }}</p>
      </div>

      <p v-if="!cargando && !rutinas.length" class="text-muted">
        No hay rutinas públicas por ahora. Probá crear una y marcarla como pública.
      </p>

      <div class="discover-grid">
        <article
          v-for="r in rutinas"
          :key="r.id"
          class="discover-card"
        >
          <header class="discover-card__header">
            <div>
              <h4 class="mb-0">{{ r.title }}</h4>
              <small class="text-muted">
                {{ r.category || 'Sin categoría' }} · {{ r.level || 'Sin nivel' }}
              </small>
            </div>
            <div class="discover-card__badges">
              <span class="badge badge--public" v-if="r.isPublic !== false">Pública</span>
              <span class="badge badge--collab" v-if="r.allowCollab">Colaborativa</span>
            </div>
          </header>

          <p v-if="r.description" class="discover-card__desc">
            {{ r.description }}
          </p>

          <div class="discover-card__meta">
            <small class="text-muted">
              ★ {{ (r.likedByIds && r.likedByIds.length) || 0 }}
            </small>
            <small class="text-muted">
              Colaboradores: {{ (r.collaboratorsIds && r.collaboratorsIds.length) || 0 }}
            </small>
          </div>

          <footer class="discover-card__actions">
            <button
              type="button"
              class="btn-small"
              @click="toggleLike(r)"
            >
              {{ hasLike(r) ? 'Quitar fav' : 'Favorito' }}
            </button>

            <button
              type="button"
              class="btn-small btn-primary-outline"
              :disabled="collabDisabled(r)"
              @click="pedirColaborar(r)"
            >
              {{ collabLabel(r) }}
            </button>
          </footer>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.page {
  padding: 2rem 2.5rem;
}

.discover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.messages {
  min-height: 1.1rem;
  margin-bottom: 0.4rem;
}

.msg {
  font-size: 0.85rem;
}

.msg--ok {
  color: #4ade80;
}

.msg--error {
  color: #fb7185;
}

.discover-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.9rem;
}

.discover-card {
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(15, 23, 42, 0.95);
  padding: 0.9rem 0.95rem 0.85rem;
}

.discover-card__header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}

.discover-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  justify-content: flex-end;
}

.discover-card__desc {
  margin: 0.55rem 0 0.4rem;
  font-size: 0.9rem;
}

.discover-card__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  margin-bottom: 0.45rem;
}

.discover-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.4rem;
}

.badge {
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.badge--public {
  background: rgba(56, 189, 248, 0.18);
  color: #38bdf8;
}

.badge--collab {
  background: rgba(45, 212, 191, 0.18);
  color: #5eead4;
}

.btn-small {
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background: transparent;
  color: var(--color-text);
  font-size: 0.8rem;
  padding: 0.25rem 0.7rem;
  cursor: pointer;
}

.btn-small:hover:not(:disabled) {
  border-color: #22d3ee;
}

.btn-small:disabled {
  opacity: 0.6;
  cursor: default;
}

.btn-primary-outline {
  border-color: rgba(56, 189, 248, 0.8);
  color: #e0f2fe;
}

@media (max-width: 900px) {
  .page {
    padding: 1.2rem 1rem;
  }
}
</style>
