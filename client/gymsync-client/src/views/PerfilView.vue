<script setup>
import { reactive, computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const usuarioStore = computed(() => store.state.auth.usuarioActual)

const form = reactive({
  name: usuarioStore.value?.name || '',
  email: usuarioStore.value?.email || '',
  age: usuarioStore.value?.age || '',
  height: usuarioStore.value?.height || '',
  currentWeight: usuarioStore.value?.currentWeight || '',
  goal: usuarioStore.value?.goal || '',
  bio: usuarioStore.value?.bio || ''
})

// Más adelante vamos a implementar el PUT al backend:
const guardarCambios = () => {
  // TODO: axios.put(`/users/${usuarioStore.value.id}`, form)
  alert('Edición de perfil pendiente de implementar contra el backend.')
}
</script>

<template>
  <section>
    <div class="card-dark mb-3">
      <span class="accent-pill">Perfil</span>
      <h1 class="mt-2 mb-1">Tu perfil de GymSync</h1>
      <p class="text-muted mb-0">
        Estos son los datos asociados a tu cuenta. Más adelante vas a poder sincronizar tu progreso
        y configuraciones desde acá.
      </p>
    </div>

    <div class="card-dark">
      <form @submit.prevent="guardarCambios">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Nombre</label>
            <input v-model="form.name" type="text" class="form-control" />
          </div>

          <div class="col-md-6">
            <label class="form-label">Email</label>
            <input v-model="form.email" type="email" class="form-control" disabled />
          </div>

          <div class="col-md-4">
            <label class="form-label">Edad</label>
            <input v-model="form.age" type="number" min="0" class="form-control" />
          </div>

          <div class="col-md-4">
            <label class="form-label">Altura (cm)</label>
            <input v-model="form.height" type="number" min="0" class="form-control" />
          </div>

          <div class="col-md-4">
            <label class="form-label">Peso actual (kg)</label>
            <input v-model="form.currentWeight" type="number" min="0" class="form-control" />
          </div>

          <div class="col-12">
            <label class="form-label">Objetivo</label>
            <input v-model="form.goal" type="text" class="form-control" placeholder="Ej: ganar masa muscular, bajar de peso..." />
          </div>

          <div class="col-12">
            <label class="form-label">Bio</label>
            <textarea
              v-model="form.bio"
              rows="3"
              class="form-control"
              placeholder="Contanos un poco sobre vos y tu entrenamiento."
            />
          </div>
        </div>

        <button type="submit" class="btn btn-primary mt-3">
          Guardar cambios
        </button>
      </form>
    </div>
  </section>
</template>
