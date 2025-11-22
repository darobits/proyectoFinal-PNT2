<!-- src/App.vue -->
<script setup>
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'
import { useStore } from 'vuex'
import Sidebar from './components/Sidebar.vue'
import Toast from './components/Toast.vue'
import logo from './assets/gymsync-logo.png'

const store = useStore()
const route = useRoute()

const esRutaAuth = computed(() => route.name === 'Login' || route.name === 'Register')
</script>

<template>
  <!-- Layout especial para LOGIN / REGISTER -->
  <div v-if="esRutaAuth" class="auth-wrapper">
    <div class="auth-card">
      <div class="auth-logo">
        <img :src="logo" alt="GymSync logo" />
      </div>

      <h1 class="auth-title">
        {{ route.name === 'Login' ? 'Iniciar sesión' : 'Crear cuenta' }}
      </h1>
      <p class="auth-subtitle">
        {{ route.name === 'Login'
          ? 'Ingresá con tu email y contraseña para ver tus rutinas y progreso.'
          : 'Registrate para guardar tus rutinas, progreso y ver estadísticas personalizadas.' }}
      </p>

      <RouterView />
    </div>
  </div>

  <!-- Layout principal con sidebar para el resto de la app -->
  <div v-else class="app-shell">
    <Sidebar />

    <main class="app-main">
      <div class="page-container">
        <RouterView />
      </div>
    </main>

    <!-- 👇 Toast global flotante -->
    <Toast />
  </div>
</template>
