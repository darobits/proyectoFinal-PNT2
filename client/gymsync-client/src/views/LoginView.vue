<script setup>
import { reactive, ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter, RouterLink } from 'vue-router'

const store = useStore()
const router = useRouter()

// formulario igual que antes
const form = reactive({
  email: '',
  password: ''
})

const error = ref(null)
const loading = ref(false)

const onSubmit = async () => {
  loading.value = true
  error.value = null

  try {
    // llama al backend vía Vuex EXACTAMENTE como debe
    await store.dispatch('auth/login', { ...form })

    // cuando login funciona → vamos al home
    router.push({ name: 'Feed' })
  } catch (e) {
    // mensaje del backend o mensaje genérico
    error.value = e.response?.data?.error || 'Credenciales inválidas'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form @submit.prevent="onSubmit">
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

    <div v-if="error" class="alert alert-danger">
      {{ error }}
    </div>

    <button class="btn btn-primary w-100" :disabled="loading">
      {{ loading ? 'Ingresando...' : 'Ingresar' }}
    </button>

    <p class="mt-3 text-muted">
      ¿No tenés cuenta?
      <RouterLink to="/register">Registrate acá</RouterLink>.
    </p>
  </form>
</template>
