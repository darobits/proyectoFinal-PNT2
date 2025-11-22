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
  password: '' // nueva contraseña (opcional)
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

  // armamos payload sin tocar email
  const payload = {
    name: form.name,
    age: form.age,
    height: form.height,
    currentWeight: form.currentWeight,
    goal: form.goal,
    bio: form.bio
  }

  // solo mandamos password si el usuario escribió algo
  if (form.password && form.password.trim().length > 0) {
    payload.password = form.password.trim()
  }

  try {
    const { data } = await api.put('/users/me', payload, authConfig.value)

    // Actualizamos usuarioActual en el store para que se vea el cambio abajo a la izquierda
    const token = store.state.auth.token
    store.commit('auth/setAuth', { usuario: data, token })

    mensajeOk.value = 'Perfil actualizado correctamente.'
    form.password = '' // limpiamos contraseña después de guardar
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
  <main class="perfil">
    <section class="perfil__header-card">
      <div class="badge">Perfil</div>
      <h1>Tu perfil de GymSync</h1>
      <p>
        Estos son los datos asociados a tu cuenta. Desde aquí podés actualizar tu información
        y cambiar tu contraseña.
      </p>
    </section>

    <section class="perfil__form-card">
      <form class="perfil-form" @submit.prevent="guardarCambios">
        <div class="perfil-form__row perfil-form__row--two">
          <div class="field">
            <label>Nombre</label>
            <input v-model="form.name" type="text" required />
          </div>
          <div class="field">
            <label>Email</label>
            <input v-model="form.email" type="email" disabled />
          </div>
        </div>

        <div class="perfil-form__row perfil-form__row--three">
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

        <div class="perfil-form__row">
          <div class="field">
            <label>Objetivo</label>
            <input
              v-model="form.goal"
              type="text"
              placeholder="Ej: ganar masa muscular, bajar de peso..."
            />
          </div>
        </div>

        <div class="perfil-form__row">
          <div class="field">
            <label>Bio</label>
            <textarea
              v-model="form.bio"
              rows="3"
              placeholder="Contanos un poco sobre vos y tu entrenamiento."
            ></textarea>
          </div>
        </div>

        <div class="perfil-form__row">
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

        <div class="perfil-form__messages">
          <span v-if="mensajeOk" class="msg msg--ok">{{ mensajeOk }}</span>
          <span v-if="mensajeError" class="msg msg--error">{{ mensajeError }}</span>
        </div>

        <div class="perfil-form__actions">
          <button class="btn-primary" type="submit" :disabled="guardando || cargando">
            {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </form>
    </section>
  </main>
</template>

<style scoped>
.perfil {
  padding: 2rem 2.5rem;
  color: var(--color-text);
}

.perfil__header-card {
  background: rgba(15, 23, 42, 0.95);
  border-radius: 1.2rem;
  padding: 1.6rem 2rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.9);
  margin-bottom: 1.8rem;
}

.badge {
  display: inline-flex;
  padding: 0.18rem 0.75rem;
  border-radius: 999px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.13em;
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  margin-bottom: 0.6rem;
}

.perfil__header-card h1 {
  margin: 0 0 0.25rem;
  font-size: 1.9rem;
}

.perfil__header-card p {
  margin: 0;
  color: var(--color-text-muted);
  max-width: 750px;
}

.perfil__form-card {
  background: rgba(15, 23, 42, 0.95);
  border-radius: 1.2rem;
  padding: 1.8rem 2rem 1.6rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.9);
}

.perfil-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.perfil-form__row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.perfil-form__row--two {
  gap: 0.75rem;
}

.perfil-form__row--three {
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.field input,
.field textarea {
  border-radius: 0.7rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.95);
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  color: var(--color-text);
}

.field input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.password-wrapper {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.password-wrapper input {
  flex: 1;
}

.password-toggle {
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
}

.perfil-form__row--two {
  flex-direction: row;
}

.perfil-form__row--two > .field {
  flex: 1;
}

.perfil-form__row--three {
  flex-direction: row;
}

.perfil-form__row--three > .field {
  flex: 1;
}

.perfil-form__messages {
  min-height: 1.2rem;
}

.msg {
  font-size: 0.85rem;
}

.msg--ok {
  color: #4ade80;
}

.msg--error {
  color: #f97373;
}

.perfil-form__actions {
  margin-top: 0.4rem;
}

.btn-primary {
  border-radius: 999px;
  border: none;
  padding: 0.55rem 1.4rem;
  background: linear-gradient(135deg, #22d3ee, #0ea5e9);
  color: #020617;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: default;
}

@media (max-width: 900px) {
  .perfil {
    padding: 1.2rem 1rem;
  }

  .perfil__form-card,
  .perfil__header-card {
    padding: 1.2rem 1.2rem;
  }

  .perfil-form__row--two,
  .perfil-form__row--three {
    flex-direction: column;
  }
}
</style>
