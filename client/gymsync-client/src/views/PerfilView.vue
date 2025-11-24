<script setup>
import { reactive, ref, onMounted, computed } from 'vue'
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

const form = reactive({
  name: '',
  email: '',
  age: null,
  height: null,
  currentWeight: null,
  goal: '',
  bio: '',
  password: ''
})

const cargando = ref(false)
const guardando = ref(false)
const mensajeOk = ref('')
const mensajeError = ref('')
const mostrarPassword = ref(false)

const cargarPerfil = async () => {
  cargando.value = true
  mensajeError.value = ''
  try {
    const { data } = await api.get('/users/me', authConfig.value)
    form.name = data.name
    form.email = data.email
    form.age = data.age
    form.height = data.height
    form.currentWeight = data.currentWeight
    form.goal = data.goal
    form.bio = data.bio
  } catch (e) {
    console.error(e)
    mensajeError.value = 'No se pudo cargar tu perfil.'
  } finally {
    cargando.value = false
  }
}

const guardarCambios = async () => {
  guardando.value = true
  mensajeError.value = ''
  mensajeOk.value = ''

  const payload = {
    name: form.name,
    age: form.age,
    height: form.height,
    currentWeight: form.currentWeight,
    goal: form.goal,
    bio: form.bio
  }

  if (form.password && form.password.trim().length > 0) {
    payload.password = form.password.trim()
  }

  try {
    const { data } = await api.put('/users/me', payload, authConfig.value)

    const token = store.state.auth.token
    store.commit('auth/setAuth', { usuario: data, token })

    mensajeOk.value = 'Perfil actualizado correctamente.'
    form.password = ''
  } catch (e) {
    console.error(e)
    mensajeError.value = 'No se pudieron guardar los cambios.'
  } finally {
    guardando.value = false
  }
}

onMounted(() => {
  cargarPerfil()
})
</script>

<template>
  <main class="profile-page">
    <section class="profile-card">
      <header class="profile-header">
        <div class="avatar">
          <span>
            {{ form.name ? form.name.charAt(0).toUpperCase() : 'U' }}
          </span>
        </div>
        <div class="profile-header-text">
          <h1 class="profile-title">Tu perfil de GymSync</h1>
          <p class="profile-subtitle">
            Revisá tus datos personales, ajustá tus objetivos y cambiá tu contraseña cuando lo
            necesites.
          </p>
        </div>
      </header>

      <p v-if="cargando" class="profile-loading">
        Cargando tu perfil...
      </p>

      <form
        v-else
        class="profile-form"
        @submit.prevent="guardarCambios"
      >
        <div class="form-row form-row--two">
          <div class="field">
            <label>Nombre</label>
            <input v-model="form.name" type="text" required />
          </div>
          <div class="field">
            <label>Email</label>
            <input v-model="form.email" type="email" disabled />
          </div>
        </div>

        <div class="form-row form-row--three">
          <div class="field">
            <label>Edad</label>
            <input v-model.number="form.age" type="number" min="0" />
          </div>
          <div class="field">
            <label>Altura (cm)</label>
            <input v-model.number="form.height" type="number" min="0" />
          </div>
          <div class="field">
            <label>Peso actual (kg)</label>
            <input v-model.number="form.currentWeight" type="number" min="0" />
          </div>
        </div>

        <div class="form-row">
          <div class="field">
            <label>Objetivo</label>
            <input
              v-model="form.goal"
              type="text"
              placeholder="Ej: ganar masa muscular, bajar de peso..."
            />
          </div>
        </div>

        <div class="form-row">
          <div class="field">
            <label>Bio</label>
            <textarea
              v-model="form.bio"
              rows="3"
              placeholder="Contanos un poco sobre vos y tu entrenamiento."
            ></textarea>
          </div>
        </div>

        <div class="form-row">
          <div class="field">
            <label>Nueva contraseña (opcional)</label>
            <div class="password-wrapper">
              <input
                v-model="form.password"
                :type="mostrarPassword ? 'text' : 'password'"
                placeholder="Dejar vacío si no querés cambiarla"
              />
              <button
                type="button"
                class="password-toggle"
                @click="mostrarPassword = !mostrarPassword"
              >
                {{ mostrarPassword ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
          </div>
        </div>

        <div class="form-messages">
          <span v-if="mensajeOk" class="msg msg--ok">{{ mensajeOk }}</span>
          <span v-if="mensajeError" class="msg msg--error">{{ mensajeError }}</span>
        </div>

        <div class="form-actions">
          <button class="primary-btn" type="submit" :disabled="guardando || cargando">
            {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </form>
    </section>
  </main>
</template>

<style scoped>
.profile-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1.5rem;
}

.profile-card {
  width: 100%;
  max-width: 820px;
  background: radial-gradient(circle at top, rgba(37, 99, 235, 0.28), transparent 55%),
              radial-gradient(circle at bottom, rgba(16, 185, 129, 0.18), transparent 55%),
              rgba(15, 23, 42, 0.96);
  border-radius: 1.5rem;
  padding: 1.9rem 2.1rem 2.2rem;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.32);
  color: #e5e7eb;
}

/* Header con avatar */
.profile-header {
  display: flex;
  align-items: center;
  gap: 1.3rem;
  margin-bottom: 1.5rem;
}

.avatar {
  width: 88px;
  height: 88px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 20%, #22c55e, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.95);
}

.avatar span {
  font-size: 2rem;
  font-weight: 700;
  color: #f9fafb;
}

.profile-header-text {
  flex: 1;
}

.profile-title {
  font-size: 1.6rem;
  margin: 0 0 0.2rem;
  font-weight: 700;
}

.profile-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: #a5b4fc;
}

/* Loading */
.profile-loading {
  margin-top: 0.8rem;
  font-size: 0.9rem;
  color: #9ca3af;
}

/* Formulario */
.profile-form {
  margin-top: 0.3rem;
  background: rgba(15, 23, 42, 0.95);
  border-radius: 1.1rem;
  border: 1px solid rgba(30, 64, 175, 0.5);
  padding: 1.4rem 1.5rem 1.5rem;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.8rem;
}

.form-row--two {
  flex-direction: row;
  gap: 0.9rem;
}

.form-row--three {
  flex-direction: row;
  gap: 0.9rem;
}

.field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field label {
  font-size: 0.83rem;
  color: #9ca3af;
}

.field input,
.field textarea {
  border-radius: 0.7rem;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(15, 23, 42, 0.98);
  padding: 0.5rem 0.8rem;
  font-size: 0.9rem;
  color: #e5e7eb;
}

.field input:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* password */
.password-wrapper {
  display: flex;
  gap: 0.45rem;
  align-items: center;
}

.password-wrapper input {
  flex: 1;
}

.password-toggle {
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background: transparent;
  color: #9ca3af;
  font-size: 0.78rem;
  padding: 0.35rem 0.8rem;
  cursor: pointer;
}

.password-toggle:hover {
  border-color: #60a5fa;
  color: #e5e7eb;
}

/* mensajes */
.form-messages {
  min-height: 1.1rem;
  margin-bottom: 0.3rem;
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

/* acciones */
.form-actions {
  margin-top: 0.3rem;
}

.primary-btn {
  border-radius: 999px;
  border: none;
  padding: 0.6rem 1.5rem;
  background: linear-gradient(135deg, #2563eb, #22c55e);
  color: #f9fafb;
  font-weight: 600;
  font-size: 0.9rem;
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

/* responsive */
@media (max-width: 900px) {
  .profile-page {
    padding: 1.6rem 1.1rem;
  }

  .profile-card {
    padding: 1.6rem 1.4rem 1.8rem;
  }

  .profile-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-row--two,
  .form-row--three {
    flex-direction: column;
  }

  .profile-form {
    padding: 1.1rem 1.1rem 1.3rem;
  }
}
</style>
