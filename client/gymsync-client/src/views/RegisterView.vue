<script setup>
import { reactive, ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter, RouterLink } from 'vue-router'

const store = useStore()
const router = useRouter()

const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'USER'  // siempre usuario por defecto
})

const error = ref(null)
const loading = ref(false)

const onSubmit = async () => {
  loading.value = true
  error.value = null

  try {
    await store.dispatch('auth/register', { ...form })
    router.push({ name: 'Login' })
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al registrarse'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <div class="mb-3">
      <label class="form-label">Nombre</label>
      <input v-model="form.name" type="text" class="form-control" required />
    </div>

    <div class="mb-3">
      <label class="form-label">Email</label>
      <input v-model="form.email" type="email" class="form-control" required />
    </div>

    <div class="mb-3">
      <label class="form-label">Contraseña</label>
      <input
        v-model="form.password"
        type="password"
        class="form-control"
        required
      />
    </div>

    <!-- ⚠️ CAMPO DE ROL ELIMINADO -->
    
    <div v-if="error" class="alert alert-danger">
      {{ error }}
    </div>

    <button class="btn btn-primary w-100" :disabled="loading">
      {{ loading ? 'Creando cuenta...' : 'Registrarse' }}
    </button>

    <p class="mt-3 text-muted">
      ¿Ya tenés cuenta?
      <RouterLink to="/login">Iniciá sesión</RouterLink>.
    </p>
  </form>
</template>
