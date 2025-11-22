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

// navegación dinámica con reglas
const navItems = computed(() => [
  { name: 'Inicio',       to: { name: 'Feed' },          show: estaLogueado.value },
  { name: 'Mis rutinas',  to: { name: 'MisRutinas' },    show: estaLogueado.value },
  { name: 'Mi progreso',  to: { name: 'MiProgreso' },    show: estaLogueado.value },
  { name: 'Estadísticas', to: { name: 'Estadisticas' },  show: estaLogueado.value },
  { name: 'Perfil',       to: { name: 'Perfil' },        show: estaLogueado.value },
  // 👇 Solo admins ven “Perfiles” (gestión de usuarios)
  { name: 'Perfiles',     to: { name: 'AdminPerfiles' }, show: esAdmin.value }
])

const isActive = (to) => route.name === to.name

const logout = () => {
  store.commit('auth/logout')
  router.push({ name: 'Login' })
}
</script>

<template>
  <aside class="sidebar">
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
  justify-content: space-between;
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
  gap: 0.55rem;
  padding: 0.45rem 0.65rem;
  border-radius: 999px;
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease;
}

.sidebar__link:hover {
  background: rgba(148, 163, 184, 0.1);
  color: var(--color-text);
  transform: translateX(2px);
}

.sidebar__link--active {
  background: linear-gradient(
    90deg,
    rgba(34, 211, 238, 0.18),
    rgba(251, 146, 60, 0.18)
  );
  color: var(--color-primary);
}

.sidebar__bottom {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sidebar__user-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: rgba(15, 23, 42, 0.9);
  border-radius: 999px;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--color-border);
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
  font-size: 0.9rem;
  color: #020617;
}

.sidebar__user-info {
  flex: 1;
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
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  align-self: flex-start;
}

.sidebar__logout-btn:hover {
  color: var(--color-primary);
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    flex-direction: row;
    align-items: center;
    padding: 0.75rem 1rem;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  .sidebar__top {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }

  .sidebar__nav nav {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.2rem;
  }

  .sidebar__bottom {
    display: none;
  }
}
</style>
