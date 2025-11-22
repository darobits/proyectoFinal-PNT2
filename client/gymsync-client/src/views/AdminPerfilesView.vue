<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import axios from 'axios'
import { useToast } from '../composables/useToast'

const store = useStore()
const { showToast } = useToast()

// instancia axios apuntando a tu backend Express
const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

// headers con token JWT
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
const confirmDeleteId = ref(null) // id del usuario al que se le pidió confirmación

// NUEVO: controla si se muestra o no el formulario
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
  mostrarForm.value = true      // << mostrar form solo cuando se hace clic en "Nuevo usuario"
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

  mostrarForm.value = true      // << mostrar form cuando se edita un usuario
}

const cancelarEdicion = () => {
  resetForm()
  mostrarForm.value = false     // << ocultar form al cancelar
}

// click en botón "Eliminar"
const onClickEliminar = (u) => {
  // no dejar que se borre a sí mismo
  if (usuarioActual.value && usuarioActual.value.id === u.id) {
    showToast('No podés eliminar tu propio usuario.', 'error')
    return
  }

  // si ya está marcado para confirmar, ahora sí eliminamos
  if (confirmDeleteId.value === u.id) {
    eliminarUsuario(u)
  } else {
    // primer clic: pedimos confirmación “silenciosa”
    confirmDeleteId.value = u.id
    showToast(`Volvé a hacer clic en "Eliminar" para confirmar.`, 'info')
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
    mostrarForm.value = false   // << tras guardar, volvemos solo al listado
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
  <main class="admin-perfiles">
    <header class="admin-perfiles__header">
      <h1>Perfiles de usuarios</h1>
      <p>Gestión de usuarios de GymSync (solo administradores).</p>
    </header>

    <section class="admin-perfiles__grid">
      <!-- Columna izquierda: listado -->
      <div class="admin-perfiles__card admin-perfiles__card--left">
        <div class="card-header">
          <h2>Usuarios registrados</h2>
          <button class="pill-btn" type="button" @click="nuevoUsuario">
            Nuevo usuario
          </button>
        </div>

        <p v-if="error" class="text-error">{{ error }}</p>
        <p v-else-if="cargando" class="text-muted">Cargando usuarios...</p>

        <table v-if="!cargando && usuarios.length" class="users-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Edad</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in usuarios" :key="u.id">
              <td>{{ u.name }}</td>
              <td>{{ u.email }}</td>
              <td>{{ u.age ?? '—' }}</td>
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
          No hay usuarios registrados.
        </p>
      </div>

      <!-- Columna derecha: formulario (solo si se está creando/editando) -->
      <div
        v-if="mostrarForm"
        class="admin-perfiles__card admin-perfiles__card--right"
      >
        <h2>{{ esModoEdicion ? 'Editar usuario' : 'Nuevo usuario' }}</h2>

        <form class="form" @submit.prevent="guardarUsuario">
          <div class="form-row">
            <label>Nombre</label>
            <input v-model="form.name" type="text" required />
          </div>

          <div class="form-row">
            <label>Email</label>
            <input v-model="form.email" type="email" required />
          </div>

          <div class="form-row form-row--inline">
            <div>
              <label>Edad</label>
              <input v-model.number="form.age" type="number" min="0" />
            </div>
            <div>
              <label>Altura (cm)</label>
              <input v-model.number="form.height" type="number" min="0" />
            </div>
            <div>
              <label>Peso actual (kg)</label>
              <input v-model.number="form.currentWeight" type="number" min="0" />
            </div>
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
              {{ guardando ? 'Guardando...' : 'Guardar' }}
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
    </section>
  </main>
</template>

<style scoped>
/* tu CSS igual que antes, no lo toqué */
.admin-perfiles {
  padding: 2rem 2.5rem;
  color: var(--color-text);
}

.admin-perfiles__header h1 {
  font-size: 1.7rem;
  margin-bottom: 0.25rem;
}

.admin-perfiles__header p {
  margin: 0;
  color: var(--color-text-muted);
}

.admin-perfiles__grid {
  margin-top: 2rem;
  display: grid;
  grid-template-columns: 2fr 1.4fr;
  gap: 1.5rem;
}

.admin-perfiles__card {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.9);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.users-table th,
.users-table td {
  padding: 0.5rem 0.4rem;
  text-align: left;
}

.users-table thead {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.users-table tbody tr:nth-child(odd) {
  background: rgba(15, 23, 42, 0.7);
}

.badge {
  display: inline-flex;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: rgba(148, 163, 184, 0.2);
}

.badge--admin {
  background: rgba(34, 197, 94, 0.18);
  color: #4ade80;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-size: 0.8rem;
  cursor: pointer;
}

.link-btn--danger {
  color: #f97373;
}

.link-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.pill-btn {
  border: none;
  border-radius: 999px;
  padding: 0.45rem 1.1rem;
  font-size: 0.8rem;
  cursor: pointer;
  background: linear-gradient(135deg, #22d3ee, #6366f1);
  color: #0b1020;
  font-weight: 600;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin-top: 0.5rem;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-row label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.form-row input,
.form-row textarea,
.form-row select {
  border-radius: 0.6rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.9);
  padding: 0.45rem 0.7rem;
  font-size: 0.85rem;
  color: var(--color-text);
}

.form-row--inline {
  flex-direction: row;
  gap: 0.75rem;
}

.form-row--inline > div {
  flex: 1;
}

.form-actions {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.7rem;
}

.primary-btn,
.secondary-btn {
  border-radius: 999px;
  padding: 0.45rem 1.2rem;
  font-size: 0.85rem;
  border: none;
  cursor: pointer;
}

.primary-btn {
  background: linear-gradient(135deg, #22d3ee, #0ea5e9);
  color: #020617;
  font-weight: 600;
}

.secondary-btn {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.4);
  color: var(--color-text-muted);
}

.text-error {
  color: #f97373;
  font-size: 0.9rem;
}

.text-muted {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

@media (max-width: 1024px) {
  .admin-perfiles__grid {
    grid-template-columns: 1fr;
  }
}
</style>
