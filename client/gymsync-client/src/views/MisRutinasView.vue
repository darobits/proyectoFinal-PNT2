<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
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
const esAdmin = computed(() => store.getters['auth/rolActual'] === 'ADMIN')

const rutinas = ref([])
const cargando = ref(false)
const guardando = ref(false)
const mensajeError = ref('')
const mensajeOk = ref('')

const modo = ref('crear') // 'crear' | 'editar'
const editId = ref(null)

const form = reactive({
  title: '',
  description: '',
  category: '',
  level: '',
  isPublic: true,
  allowCollab: true
})

const usuariosMap = ref({})

const resetForm = () => {
  modo.value = 'crear'
  editId.value = null
  form.title = ''
  form.description = ''
  form.category = ''
  form.level = ''
  form.isPublic = true
  form.allowCollab = true
}

// ¿creador o admin? (para ver/aprobar solicitudes)
const puedeAprobar = (r) => {
  const userId = usuarioActual.value?.id
  if (!userId) return false
  const esCreador = r.creatorId === userId
  return esCreador || esAdmin.value
}

// ¿puede editar? → creador, colaborador o admin
const puedeEditar = (r) => {
  const userId = usuarioActual.value?.id
  if (!userId) return false
  const esCreador = r.creatorId === userId
  const esColab = Array.isArray(r.collaboratorsIds) && r.collaboratorsIds.includes(userId)
  return esCreador || esColab || esAdmin.value
}

// ¿puede eliminar? → solo creador o admin
const puedeEliminar = (r) => {
  const userId = usuarioActual.value?.id
  if (!userId) return false
  const esCreador = r.creatorId === userId
  return esCreador || esAdmin.value
}

const cargarRutinas = async () => {
  cargando.value = true
  mensajeError.value = ''
  try {
    const { data } = await api.get('/routines', authConfig.value)
    rutinas.value = data
  } catch (e) {
    console.error(e)
    mensajeError.value = 'No se pudieron cargar tus rutinas.'
  } finally {
    cargando.value = false
  }
}

const cargarUsuarios = async () => {
  try {
    const { data } = await api.get('/users', authConfig.value)
    const map = {}
    data.forEach(u => {
      map[u.id] = u
    })
    usuariosMap.value = map
  } catch (e) {
    console.error('Error cargando usuarios para solicitudes', e)
  }
}

const guardarRutina = async () => {
  if (!form.title.trim()) {
    mensajeError.value = 'El título es obligatorio.'
    return
  }

  guardando.value = true
  mensajeError.value = ''
  mensajeOk.value = ''

  const payload = {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    level: form.level.trim(),
    isPublic: form.isPublic,
    allowCollab: form.allowCollab
  }

  try {
    if (modo.value === 'crear') {
      const { data } = await api.post('/routines', payload, authConfig.value)
      rutinas.value.push(data)
      mensajeOk.value = 'Rutina creada correctamente.'
    } else {
      const { data } = await api.put(`/routines/${editId.value}`, payload, authConfig.value)
      const idx = rutinas.value.findIndex(r => r.id === editId.value)
      if (idx !== -1) rutinas.value[idx] = data
      mensajeOk.value = 'Rutina actualizada correctamente.'
    }
    resetForm()
  } catch (e) {
    console.error(e)
    mensajeError.value = 'No se pudo guardar la rutina.'
  } finally {
    guardando.value = false
  }
}

const editarRutina = (r) => {
  modo.value = 'editar'
  editId.value = r.id
  form.title = r.title ?? ''
  form.description = r.description ?? ''
  form.category = r.category ?? ''
  form.level = r.level ?? ''
  form.isPublic = r.isPublic ?? true
  form.allowCollab = r.allowCollab ?? true
}

const eliminarRutina = async (r) => {
  if (!confirm(`¿Eliminar la rutina "${r.title}"?`)) return

  mensajeError.value = ''
  mensajeOk.value = ''

  try {
    await api.delete(`/routines/${r.id}`, authConfig.value)
    rutinas.value = rutinas.value.filter(x => x.id !== r.id)
    mensajeOk.value = 'Rutina eliminada.'
  } catch (e) {
    console.error(e)
    mensajeError.value = 'No se pudo eliminar la rutina.'
  }
}

const aprobarColab = async (routine, userId) => {
  mensajeError.value = ''
  mensajeOk.value = ''
  try {
    const { data } = await api.post(
      `/routines/${routine.id}/approve-collab`,
      { collaboratorId: userId },
      authConfig.value
    )
    const idx = rutinas.value.findIndex(r => r.id === data.id)
    if (idx !== -1) rutinas.value[idx] = data
    mensajeOk.value = 'Solicitud de colaboración aprobada.'
  } catch (e) {
    console.error(e)
    mensajeError.value = 'No se pudo aprobar la colaboración.'
  }
}

const rechazarColab = async (routine, userId) => {
  mensajeError.value = ''
  mensajeOk.value = ''
  try {
    const { data } = await api.post(
      `/routines/${routine.id}/reject-collab`,
      { collaboratorId: userId },
      authConfig.value
    )
    const idx = rutinas.value.findIndex(r => r.id === data.id)
    if (idx !== -1) rutinas.value[idx] = data
    mensajeOk.value = 'Solicitud de colaboración rechazada.'
  } catch (e) {
    console.error(e)
    mensajeError.value = 'No se pudo rechazar la colaboración.'
  }
}

onMounted(() => {
  cargarRutinas()
  cargarUsuarios()
})
</script>

<template>
  <main class="page">
    <!-- HEADER -->
    <section class="card-dark mb-4">
      <span class="accent-pill">rutinas</span>
      <h1 class="mt-2 mb-1">Mis rutinas</h1>
      <p class="text-muted mb-0">
        Desde acá podés crear, editar y administrar tus rutinas. Las que marques como
        <strong>públicas</strong> van a aparecer en la sección <strong>Descubrir</strong>.
      </p>
    </section>

    <section class="row g-3">
      <!-- FORMULARIO -->
      <div class="col-md-5">
        <div class="card-dark">
          <h3 class="mb-2">
            {{ modo === 'crear' ? 'Nueva rutina' : 'Editar rutina' }}
          </h3>

          <div class="form-group">
            <label>Título</label>
            <input v-model="form.title" type="text" placeholder="Ej: Full body novatos" />
          </div>

          <div class="form-group">
            <label>Descripción</label>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="Contá brevemente en qué consiste la rutina."
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Categoría</label>
              <input v-model="form.category" type="text" placeholder="Full body, Push/Pull, etc." />
            </div>
            <div class="form-group">
              <label>Nivel</label>
              <input
                v-model="form.level"
                type="text"
                placeholder="Principiante / Intermedio / Avanzado"
              />
            </div>
          </div>

          <div class="form-row form-row--toggles">
            <label class="toggle">
              <input type="checkbox" v-model="form.isPublic" />
              <span class="toggle__visual"></span>
              <span class="toggle__label">Rutina pública</span>
            </label>

            <label class="toggle">
              <input type="checkbox" v-model="form.allowCollab" />
              <span class="toggle__visual"></span>
              <span class="toggle__label">Permite colaboradores</span>
            </label>
          </div>

          <div class="mt-3">
            <button
              class="btn-primary"
              type="button"
              :disabled="guardando"
              @click="guardarRutina"
            >
              {{ guardando
                ? 'Guardando...'
                : (modo === 'crear' ? 'Crear rutina' : 'Guardar cambios') }}
            </button>

            <button
              v-if="modo === 'editar'"
              class="btn-secondary"
              type="button"
              @click="resetForm"
            >
              Cancelar
            </button>
          </div>

          <p v-if="mensajeOk" class="msg msg--ok mt-2">{{ mensajeOk }}</p>
          <p v-if="mensajeError" class="msg msg--error mt-2">{{ mensajeError }}</p>
        </div>
      </div>

      <!-- LISTA DE RUTINAS -->
      <div class="col-md-7">
        <div class="card-dark">
          <div class="d-flex justify-between align-center mb-2">
            <h3 class="mb-0">Tus rutinas</h3>
            <span v-if="cargando" class="text-muted small">Cargando...</span>
          </div>

          <p v-if="!cargando && !rutinas.length" class="text-muted">
            Todavía no creaste ninguna rutina. Empezá con el formulario de la izquierda.
          </p>

          <div
            v-for="r in rutinas"
            :key="r.id"
            class="routine-item"
          >
            <div class="routine-item__header">
              <div>
                <h4 class="mb-0">{{ r.title }}</h4>
                <small class="text-muted">
                  {{ r.category || 'Sin categoría' }} •
                  {{ r.level || 'Sin nivel' }}
                </small>
              </div>

              <div class="routine-item__badges">
                <span
                  class="badge"
                  :class="r.isPublic ? 'badge--public' : 'badge--private'"
                >
                  {{ r.isPublic ? 'Pública' : 'Privada' }}
                </span>
                <span
                  class="badge"
                  :class="r.allowCollab ? 'badge--collab' : 'badge--nocollab'"
                >
                  {{ r.allowCollab ? 'Colaborativa' : 'Sólo creador' }}
                </span>
              </div>
            </div>

            <p class="routine-item__desc" v-if="r.description">
              {{ r.description }}
            </p>

            <div class="routine-item__meta">
              <small class="text-muted">
                Creada el
                {{ r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-' }}
              </small>
              <small class="text-muted">
                Likes: {{ (r.likedByIds && r.likedByIds.length) || 0 }}
                • Colaboradores:
                {{ (r.collaboratorsIds && r.collaboratorsIds.length) || 0 }}
              </small>
            </div>

            <!-- SOLICITUDES DE COLABORACIÓN (solo creador/admin) -->
            <div
              v-if="puedeAprobar(r) && r.pendingCollabIds && r.pendingCollabIds.length"
              class="routine-item__pending"
            >
              <small class="text-muted">Solicitudes de colaboración:</small>

              <div
                v-for="uid in r.pendingCollabIds"
                :key="uid"
                class="pending-row"
              >
                <span class="pending-row__name">
                  {{ usuariosMap[uid]?.name || ('Usuario #' + uid) }}
                </span>
                <div class="pending-row__actions">
                  <button
                    class="btn-small"
                    type="button"
                    @click="aprobarColab(r, uid)"
                  >
                    Aprobar
                  </button>
                  <button
                    class="btn-small btn-danger"
                    type="button"
                    @click="rechazarColab(r, uid)"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            </div>

            <div class="routine-item__actions">
              <button
                v-if="puedeEditar(r)"
                class="btn-small"
                type="button"
                @click="editarRutina(r)"
              >
                Editar
              </button>
              <button
                v-if="puedeEliminar(r)"
                class="btn-small btn-danger"
                type="button"
                @click="eliminarRutina(r)"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.page {
  padding: 2rem 2.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.form-group label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.form-group input,
.form-group textarea {
  border-radius: 0.7rem;
  border: 1px solid rgba(198, 202, 208, 0.35);
  background:   rgba(42, 56, 84, 0.95);;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  color: var(--color-text);
}

.form-row {
  display: flex;
  gap: 0.75rem;
}

.form-row--toggles {
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

/* toggles */
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.toggle input {
  display: none;
}

.toggle__visual {
  width: 34px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.7);
  background: rgba(15, 23, 42, 0.9);
  position: relative;
  transition: 0.18s;
}

.toggle__visual::after {
  content: '';
  position: absolute;
  top: 1px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.9);
  transition: 0.18s;
}

.toggle input:checked + .toggle__visual {
  border-color: #22d3ee;
  background: rgba(45, 212, 191, 0.12);
}

.toggle input:checked + .toggle__visual::after {
  transform: translateX(14px);
  background: #22d3ee;
}

.toggle__label {
  user-select: none;
}

/* lista de rutinas */
.routine-item {
  border-radius: 0.9rem;
  border: 1px solid rgba(148, 163, 184, 0.28);
  padding: 0.8rem 0.9rem;
  margin-bottom: 0.7rem;
  background: rgba(15, 23, 42, 0.9);
}

.routine-item__header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}

.routine-item__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.routine-item__desc {
  margin: 0.5rem 0 0.35rem;
  font-size: 0.9rem;
}

.routine-item__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  margin-bottom: 0.4rem;
}

/* bloque de solicitudes */
.routine-item__pending {
  border-top: 1px dashed rgba(148, 163, 184, 0.35);
  margin-top: 0.4rem;
  padding-top: 0.4rem;
}

.pending-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.25rem;
  gap: 0.5rem;
}

.pending-row__name {
  font-size: 0.85rem;
}

.pending-row__actions {
  display: flex;
  gap: 0.3rem;
}

.routine-item__actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.4rem;
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

.badge--private {
  background: rgba(148, 163, 184, 0.18);
  color: #e5e7eb;
}

.badge--collab {
  background: rgba(45, 212, 191, 0.18);
  color: #5eead4;
}

.badge--nocollab {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}

/* mensajes */
.msg {
  font-size: 0.85rem;
}

.msg--ok {
  color: #4ade80;
}

.msg--error {
  color: #fb7185;
}

/* botones chicos */
.btn-small {
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background: transparent;
  color: var(--color-text);
  font-size: 0.8rem;
  padding: 0.25rem 0.7rem;
  cursor: pointer;
}

.btn-small:hover {
  border-color: #22d3ee;
}

.btn-danger {
  border-color: rgba(248, 113, 113, 0.7);
  color: #fecaca;
}

.btn-secondary {
  margin-left: 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background: transparent;
  padding: 0.45rem 1.1rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  cursor: pointer;
}

.btn-secondary:hover {
  border-color: #22d3ee;
  color: var(--color-text);
}

/* 👉 botón principal (Crear rutina / Guardar cambios) */
.btn-primary {
  border-radius: 999px;
  border: none;
  padding: 0.55rem 1.4rem;
  background: linear-gradient(135deg, #22d3ee, #0ea5e9);
  color: #020617;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.9);
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 16px 35px rgba(15, 23, 42, 0.95);
  filter: brightness(1.05);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: default;
}

/* responsive */
@media (max-width: 900px) {
  .page {
    padding: 1.2rem 1rem;
  }

  .form-row {
    flex-direction: column;
  }
}
</style>

