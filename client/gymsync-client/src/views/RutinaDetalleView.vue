<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useRoute } from 'vue-router'

const route = useRoute()
const rutina = ref(null)

onMounted(async () => {
  const { data } = await axios.get(`/routines/${route.params.id}`)
  rutina.value = data
})
</script>

<template>
  <div class="container">
    <h1>Detalle de Rutina</h1>

    <div v-if="!rutina" class="text-muted">Cargando...</div>

    <div v-else>
      <h2>{{ rutina.title }}</h2>
      <p>{{ rutina.description }}</p>
      <p class="text-muted">Categoría: {{ rutina.category }}</p>
      <p class="text-muted">Nivel: {{ rutina.level }}</p>
    </div>
  </div>
</template>
