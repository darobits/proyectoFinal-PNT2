<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import axios from 'axios'

const store = useStore()

// instancia axios apuntando al mismo host, usando el proxy de Vite
const api = axios.create({
  baseURL: '/api'
})

// headers con token
const authConfig = computed(() => {
  const token = store.state.auth.token
  console.log('TOKEN EN STORE:', token) // 👈 para comprobar
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  }
})

const usuarios = ref([])
const cargando = ref(false)
const guardando = ref(false)
const error = ref(null)

const modo = ref('crear') // 'crear' | 'editar'
const usuarioEditandoId = ref(null)

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
    console.log('USUARIOS CARGADOS:', data)
    usuarios.value = data
  } catch (e) {
    console.error('Error en GET /api/users:', e.response?.status, e.response?.data || e.message)
    error.value = 'Error al cargar usuarios.'
  } finally {
    cargando.value = false
  }
}

const nuevoUsuario = () => {
  resetForm()
}

const editarUsuario = (u) => {
  modo.value = 'editar'
  usuarioEditandoId.value = u.id

  form.name = u.name
  form.email = u.email
  form.age = u.age
  form.height = u.height
  form.currentWeight = u.currentWeight
  form.goal = u.goal
  form.bio = u.bio
  form.role = u.role
}

const cancelarEdicion = () => {
  resetForm()
}

const eliminarUsuario = async (u) => {
  if (!confirm(`¿Eliminar al usuario "${u.name}"?`)) return
  try {
    await api.delete(`/users/${u.id}`, authConfig.value)
    usuarios.value = usuarios.value.filter(x => x.id !== u.id)
  } catch (e) {
    console.error('Error en DELETE /api/users/:id:', e.response?.status, e.response?.data || e.message)
    alert('No se pudo eliminar el usuario.')
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
    } else {
      const id = usuarioEditandoId.value
      const { data } = await api.put(`/users/${id}`, payload, authConfig.value)
      const idx = usuarios.value.findIndex(u => u.id === id)
      if (idx !== -1) usuarios.value[idx] = data
    }
    resetForm()
  } catch (e) {
    console.error('Error en POST/PUT /api/users:', e.response?.status, e.response?.data || e.message)
    error.value = 'No se pudo guardar el usuario.'
  } finally {
    guardando.value = false
  }
}

onMounted(() => {
  cargarUsuarios()
})
</script>
