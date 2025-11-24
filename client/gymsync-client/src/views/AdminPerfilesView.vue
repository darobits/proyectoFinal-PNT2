<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import axios from 'axios'
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

const usuarios = ref([])
const cargando = ref(false)
const guardando = ref(false)
const error = ref(null)

const modo = ref('crear') // 'crear' | 'editar'
const usuarioEditandoId = ref(null)
const confirmDeleteId = ref(null)
const mostrarForm = ref(false)

const form = reactive({
  name: '',
  email: '',
  age: null,
  height: null,
  currentWeight: null,
  goal: '',
  bio: '',
  role: 'USER'
})

const esModoEdicion = computed(() => modo.value === 'editar')

const resetForm = () => {
  form.name = ''
  form.email = ''
  form.age = null
  form.height = null
  form.currentWeight = null
  form.goal = ''
  form.bio = ''
  form.role = 'USER'
  modo.value = 'crear'
  usuarioEditandoId.value = null
}

const cargarUsuarios = async () => {
  cargando.value = true
  error.value = null
  try {
    const { data } = await api.get('/users', authConfig.value)
    usuarios.value = data
  } catch (e) {
    console.error('Error cargando usuarios:', e.response?.status, e.response?.data || e.message)
    error.value = 'Error al cargar usuarios.'
  } finally {
    cargando.value = false
  }
}

const nuevoUsuario = () => {
  resetForm()
  confirmDeleteId.value = null
  mostrarForm.value = true
}

const editarUsuario = (u) => {
  modo.value = 'editar'
  usuarioEditandoId.value = u.id
  confirmDeleteId.value = null

  form.name = u.name
  form.email = u.email
  form.age = u.age
  form.height = u.height
  form.currentWeight = u.currentWeight
  form.goal = u.goal
  form.bio = u.bio
  form.role = u.role

  mostrarForm.value = true
}

const cancelarEdicion = () => {
  resetForm()
  mostrarForm.value = false
}

const onClickEliminar = (u) => {
  if (usuarioActual.value && usuarioActual.value.id === u.id) {
    showToast('No podés eliminar tu propio usuario.', 'error')
    return
  }

  if (confirmDeleteId.value === u.id) {
    eliminarUsuario(u)
  } else {
    confirmDeleteId.value = u.id
    showToast('Volvé a hacer clic en "Eliminar" para confirmar.', 'info')
  }
}

const eliminarUsuario = async (u) => {
  try {
    await api.delete(`/users/${u.id}`, authConfig.value)
    usuarios.value = usuarios.value.filter(x => x.id !== u.id)
    confirmDeleteId.value = null
    showToast(`Usuario "${u.name}" eliminado.`, 'success')
  } catch (e) {
    console.error('Error eliminando usuario:', e.response?.status, e.response?.data || e.message)
    showToast('No se pudo eliminar el usuario.', 'error')
  }
}

const guardarUsuario = async () => {
  guardando.value = true
  error.value = null

  const payload = { ...form }

  try {
    if (modo.value === 'crear') {
      const { data } = await api.post('/users', payload, authConfig.value)
      usuarios.value.push(data)
      showToast('Usuario creado correctamente.', 'success')
    } else {
      const id = usuarioEditandoId.value
      const { data } = await api.put(`/users/${id}`, payload, authConfig.value)
      const idx = usuarios.value.findIndex(u => u.id === id)
      if (idx !== -1) usuarios.value[idx] = data
      showToast('Usuario actualizado correctamente.', 'success')
    }
    resetForm()
    confirmDeleteId.value = null
    mostrarForm.value = false
  } catch (e) {
    console.error('Error guardando usuario:', e.response?.status, e.response?.data || e.message)
    error.value = 'No se pudo guardar el usuario.'
    showToast('No se pudo guardar el usuario.', 'error')
  } finally {
    guardando.value = false
  }
}

onMounted(() => {
  cargarUsuarios()
})
</script>

<template>
  <main class="admin-page">
    <section class="admin-card">
      <header class="admin-header">
        <div>
          <h1 class="admin-title">Perfiles de usuarios</h1>
          <p class="admin-subtitle">
            Gestión de cuentas de GymSync. Creá, editá y administrá usuarios y roles.
          </p>
        </div>
        <button class="primary-btn" type="button" @click="nuevoUsuario">
          Nuevo usuario
        </button>
      </header>

      <div class="admin-content">
        <!-- LISTA USUARIOS -->
        <div class="admin-column admin-column--left">
          <div class="column-header">
            <h2 class="section-title">Usuarios registrados</h2>
            <span v-if="cargando" class="text-muted small">Cargando...</span>
          </div>

          <p v-if="error" class="text-error">{{ error }}</p>

          <table v-if="!cargando && usuarios.length" class="users-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Edad</th>
                <th>Rol</th>
                <th class="th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in usuarios" :key="u.id">
                <td>
                  <div class="user-cell">
                    <div class="avatar-circle">
                      {{ u.name?.charAt(0)?.toUpperCase() || 'U' }}
                    </div>
                    <span>{{ u.name }}</span>
                  </div>
                </td>
                <td class="cell-muted">{{ u.email }}</td>
                <td class="cell-muted">{{ u.age ?? '—' }}</td>
                <td>
                  <span
                    class="badge"
                    :class="{ 'badge--admin': u.role === 'ADMIN' }"
                  >
                    {{ u.role }}
                  </span>
                </td>
                <td class="actions">
                  <button class="link-btn" type="button" @click="editarUsuario(u)">
                    Editar
                  </button>
                  <button
                    class="link-btn link-btn--danger"
                    type="button"
                    @click="onClickEliminar(u)"
                    :disabled="usuarioActual && usuarioActual.id === u.id"
                  >
                    {{ confirmDeleteId === u.id ? 'Confirmar' : 'Eliminar' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <p v-else-if="!cargando && !usuarios.length" class="text-muted">
            No hay usuarios registrados todavía.
          </p>
        </div>

        <!-- FORMULARIO -->
        <div
          v-if="mostrarForm"
          class="admin-column admin-column--right"
        >
          <h2 class="section-title">
            {{ esModoEdicion ? 'Editar usuario' : 'Nuevo usuario' }}
          </h2>

          <form class="form" @submit.prevent="guardarUsuario">
            <div class="form-row">
              <label>Nombre</label>
              <input v-model="form.name" type="text" required />
            </div>

            <div class="form-row">
              <label>Email</label>
              <input v-model="form.email" type="email" required />
            </div>

            <!-- AHORA CADA CAMPO EN SU PROPIA FILA -->
            <div class="form-row">
              <label>Edad</label>
              <input v-model.number="form.age" type="number" min="0" />
            </div>

            <div class="form-row">
              <label>Altura (cm)</label>
              <input v-model.number="form.height" type="number" min="0" />
            </div>

            <div class="form-row">
              <label>Peso actual (kg)</label>
              <input v-model.number="form.currentWeight" type="number" min="0" />
            </div>

            <div class="form-row">
              <label>Objetivo</label>
              <input v-model="form.goal" type="text" />
            </div>

            <div class="form-row">
              <label>Bio</label>
              <textarea v-model="form.bio" rows="3" />
            </div>

            <div class="form-row">
              <label>Rol</label>
              <select v-model="form.role">
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div class="form-actions">
              <button class="primary-btn" type="submit" :disabled="guardando">
                {{ guardando ? 'Guardando...' : 'Guardar usuario' }}
              </button>
              <button
                v-if="esModoEdicion"
                class="secondary-btn"
                type="button"
                @click="cancelarEdicion"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.admin-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1.5rem;
  overflow-x: hidden;
}

.admin-card {
  width: 100%;
  max-width: 1100px;
  box-sizing: border-box;
  background: radial-gradient(circle at top, rgba(37, 99, 235, 0.28), transparent 55%),
              radial-gradient(circle at bottom, rgba(16, 185, 129, 0.18), transparent 55%),
              rgba(15, 23, 42, 0.96);
  border-radius: 1.5rem;
  padding: 1.8rem 2rem 2.1rem;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.32);
  color: #e5e7eb;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.6rem;
}

.admin-title {
  font-size: 1.6rem;
  font-weight: 700;
}

.admin-subtitle {
  margin-top: 0.2rem;
  font-size: 0.9rem;
  color: #a5b4fc;
}

/* layout interno */
.admin-content {
  width: 100%;
  box-sizing: border-box;
  background: rgba(15, 23, 42, 0.94);
  border-radius: 1.2rem;
  border: 1px solid rgba(30, 64, 175, 0.5);
  padding: 1.3rem 1.3rem 1.5rem;
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1.3fr);
  gap: 1.2rem;
  overflow-x: hidden;
}

.admin-column {
  min-width: 0;
}

.admin-column--left {
  border-right: 1px solid rgba(55, 65, 81, 0.8);
  padding-right: 1.1rem;
}

.admin-column--right {
  padding-left: 0.4rem;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.9rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
}

/* tabla */
.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
}

.users-table th,
.users-table td {
  padding: 0.5rem 0.4rem;
  text-align: left;
  white-space: nowrap;
}

.users-table thead {
  color: #9ca3af;
  font-size: 0.78rem;
}

.users-table tbody tr {
  border-top: 1px solid rgba(31, 41, 55, 0.9);
}

.users-table tbody tr:nth-child(odd) {
  background: rgba(15, 23, 42, 0.8);
}

.th-actions {
  text-align: right;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.avatar-circle {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 30% 20%, #22c55e, #2563eb);
  font-weight: 700;
  font-size: 0.8rem;
  color: #f9fafb;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.9);
}

.cell-muted {
  color: #9ca3af;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.4rem;
}

/* badges y links */
.badge {
  display: inline-flex;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem;
  background: rgba(148, 163, 184, 0.25);
  color: #e5e7eb;
}

.badge--admin {
  background: rgba(34, 197, 94, 0.22);
  color: #bbf7d0;
}

.link-btn {
  border: none;
  background: transparent;
  color: #60a5fa;
  font-size: 0.78rem;
  cursor: pointer;
}

.link-btn--danger {
  color: #fb7185;
}

.link-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

/* formulario */
.form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin-top: 0.2rem;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-row label {
  font-size: 0.8rem;
  color: #9ca3af;
}

.form-row input,
.form-row textarea,
.form-row select {
  border-radius: 0.7rem;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.96);
  padding: 0.5rem 0.75rem;
  font-size: 0.86rem;
  color: #e5e7eb;
}

.form-actions {
  margin-top: 0.3rem;
  display: flex;
  gap: 0.6rem;
}

/* botones estilo login/friends */
.primary-btn {
  border-radius: 999px;
  border: none;
  padding: 0.55rem 1.5rem;
  background: linear-gradient(135deg, #2563eb, #22c55e);
  color: #f9fafb;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.95);
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 1);
  filter: brightness(1.05);
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.secondary-btn {
  border-radius: 999px;
  padding: 0.5rem 1.3rem;
  font-size: 0.84rem;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
}

.secondary-btn:hover {
  border-color: #60a5fa;
  color: #e5e7eb;
}

/* textos */
.text-error {
  color: #fb7185;
  font-size: 0.9rem;
}

.text-muted {
  color: #9ca3af;
  font-size: 0.86rem;
}

/* responsive */
@media (max-width: 1000px) {
  .admin-card {
    padding: 1.5rem 1.2rem 1.6rem;
  }

  .admin-content {
    grid-template-columns: 1fr;
    padding: 1rem;
  }

  .admin-column--left {
    border-right: none;
    padding-right: 0;
    border-bottom: 1px solid rgba(55, 65, 81, 0.8);
    padding-bottom: 1rem;
    margin-bottom: 1rem;
  }

  .admin-column--right {
    padding-left: 0;
  }
}
</style>
