<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import logo from '../assets/gymsync-logo.png'

const store = useStore()
const route = useRoute()
const router = useRouter()

const estaLogueado = computed(() => store.getters['auth/estaLogueado'])
const usuario = computed(() => store.state.auth.usuarioActual)
const esAdmin = computed(() => store.getters['auth/rolActual'] === 'ADMIN')

// visibilidad global del sidebar
const sidebarVisible = computed(() => store.state.sidebarVisible)
const toggleSidebar = () => store.commit('toggleSidebar')

// navegación dinámica con reglas
const navItems = computed(() => [
  { name: 'Inicio',       to: { name: 'Feed' },          show: estaLogueado.value },
  { name: 'Mis rutinas',  to: { name: 'MisRutinas' },    show: estaLogueado.value },
  { name: 'Mi progreso',  to: { name: 'MiProgreso' },    show: estaLogueado.value },
  { name: 'Estadísticas', to: { name: 'Estadisticas' },  show: estaLogueado.value },
  { name: 'Descubrir',    to: { name: 'Descubrir' },     show: estaLogueado.value },
  { name: 'Perfil',       to: { name: 'Perfil' },        show: estaLogueado.value },
  { name: 'Perfiles',     to: { name: 'AdminPerfiles' }, show: esAdmin.value }
])

const isActive = (to) => route.name === to.name

const logout = () => {
  store.commit('auth/logout')
  router.push({ name: 'Login' })
}
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--collapsed': !sidebarVisible }">
    <!-- Botón moderno para ocultar/mostrar -->
    <button class="sidebar__toggle" @click="toggleSidebar">
      <span class="sidebar__toggle-icon">
        {{ sidebarVisible ? '⮜' : '⮞' }}
      </span>
    </button>

    <!-- contenido colapsable -->
    <div v-if="sidebarVisible" class="sidebar__content">
      <div class="sidebar__top">
        <div class="sidebar__brand">
          <div class="sidebar__logo-pill">
            <img :src="logo" alt="GymSync logo" />
          </div>
          <div>
            <h1 class="sidebar__title">GymSync</h1>
            <p class="sidebar__subtitle">Rutinas &amp; progreso</p>
          </div>
        </div>

        <div class="sidebar__nav">
          <small class="sidebar__section-label">navegación</small>

          <nav>
            <template v-for="item in navItems" :key="item.name">
              <RouterLink
                v-if="item.show"
                :to="item.to"
                class="sidebar__link"
                :class="{ 'sidebar__link--active': isActive(item.to) }"
              >
                <span>{{ item.name }}</span>
              </RouterLink>
            </template>
          </nav>
        </div>
      </div>

      <div class="sidebar__bottom" v-if="estaLogueado">
        <div class="sidebar__user-card">
          <div class="sidebar__avatar">
            {{ usuario?.name?.charAt(0)?.toUpperCase() }}
          </div>
          <div class="sidebar__user-info">
            <span class="sidebar__user-name">{{ usuario?.name }}</span>
            <span class="sidebar__user-role">{{ usuario?.role }}</span>
          </div>
        </div>

        <button class="sidebar__logout-btn" @click="logout">
          Salir
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 260px;
  background: var(--bg-sidebar-gradient);
  border-right: 1px solid var(--color-border);
  padding: 1.5rem 1.25rem;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: width 0.25s ease, padding 0.25s ease;
}

/* sidebar colapsado */
.sidebar--collapsed {
  width: 56px;
  padding: 1rem 0.4rem;
}

/* BOTÓN MODERNO */
.sidebar__toggle {
  position: absolute;
  top: 50%;
  right: -18px;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: none;
  cursor: pointer;

  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.7);

  display: flex;
  align-items: center;
  justify-content: center;

  color: #020617;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  z-index: 10;
}

.sidebar__toggle:hover {
  transform: translateY(-50%) scale(1.05);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.9);
}

.sidebar__toggle-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.sidebar--collapsed .sidebar__toggle {
  opacity: 0.9;
}

.sidebar__content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar__top {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.sidebar__logo-pill {
  width: 46px;
  height: 46px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 30% 30%, var(--color-primary), transparent 60%),
    radial-gradient(circle at 70% 70%, var(--color-accent), transparent 60%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.sidebar__logo-pill img {
  width: 40px;
  height: 40px;
  object-fit: cover;
}

.sidebar__title {
  margin: 0;
  font-size: 1rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sidebar__subtitle {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.sidebar__section-label {
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
  margin-bottom: 0.4rem;
}

.sidebar__nav nav {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.sidebar__link {
  display: flex;
  align-items: center;
  padding: 0.45rem 0.65rem;
  border-radius: 999px;
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  transition: background 0.15s, color 0.15s, transform 0.12s;
}

.sidebar__link:hover {
  background: rgba(148, 163, 184, 0.1);
  color: var(--color-text);
  transform: translateX(2px);
}

.sidebar__link--active {
  background: linear-gradient(90deg, rgba(34, 211, 238, 0.18), rgba(251, 146, 60, 0.18));
  color: var(--color-primary);
}

.sidebar__bottom {
  margin-top: auto;
}

.sidebar__user-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}

.sidebar__avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 20%, var(--color-primary), var(--color-accent));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #020617;
}

.sidebar__user-info {
  display: flex;
  flex-direction: column;
}

.sidebar__user-name {
  font-size: 0.9rem;
}

.sidebar__user-role {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.sidebar__logout-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
}

.sidebar__logout-btn:hover {
  color: var(--color-primary);
}
</style>
