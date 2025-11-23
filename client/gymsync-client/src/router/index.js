import { createRouter, createWebHistory } from 'vue-router'
import FeedView from '../views/FeedView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import MisRutinasView from '../views/MisRutinasView.vue'
import MiProgresoView from '../views/MiProgresoView.vue'
import EstadisticasView from '../views/EstadisticasView.vue'
import AdminPerfilesView from '../views/AdminPerfilesView.vue'
import PerfilView from '../views/PerfilView.vue'
import DiscoverView from '../views/DiscoverView.vue'
import store from '../store'

const routes = [
  {
    path: '/',
    name: 'Feed',
    component: FeedView,
    meta: { requiereAuth: true }
  },
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/register', name: 'Register', component: RegisterView },

  {
    path: '/mis-rutinas',
    alias: '/misrutinas', 
    name: 'MisRutinas',
    component: MisRutinasView,
    meta: { requiereAuth: true }
  },
  {
    path: '/mi-progreso',
    name: 'MiProgreso',
    component: MiProgresoView,
    meta: { requiereAuth: true }
  },
  {
    path: '/estadisticas',
    name: 'Estadisticas',
    component: EstadisticasView,
    meta: { requiereAuth: true }
  },

  // Sección social
  {
    path: '/descubrir',
    name: 'Descubrir',
    component: DiscoverView,
    meta: { requiereAuth: true }
  },

  {
    path: '/comunidad',
    name: 'Friends',
    component: () => import('../views/FriendsView.vue'),
    meta: { requiereAuth: true }
  },

  {
    path: '/comunidad/mensajes/:friendId',
    name: 'Messages',
    component: () => import('../views/MessagesView.vue'),
    meta: { requiereAuth: true }
  },

  {
    path: '/admin/perfiles',
    name: 'AdminPerfiles',
    component: AdminPerfilesView,
    meta: { requiereAuth: true, requiereRol: 'ADMIN' }
  },

  {
    path: '/perfil',
    name: 'Perfil',
    component: PerfilView,
    meta: { requiereAuth: true }
  },
   // ⛔ CATCH-ALL: cualquier ruta desconocida → LOGIN
  {
  path: '/:pathMatch(.*)*',
  redirect: '/login'
}

]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to) => {
  const requiereAuth = to.matched.some(r => r.meta.requiereAuth)
  const requiereRol = to.meta.requiereRol
  const estaLogueado = store.getters['auth/estaLogueado']
  const rolActual = store.getters['auth/rolActual']

  // Si ya está logueado, evitar login/register
  if ((to.name === 'Login' || to.name === 'Register') && estaLogueado) {
    return { name: 'Feed' }
  }

  // Si requiere auth y NO está logueado → Login
  if (requiereAuth && !estaLogueado) {
    return { name: 'Login' }
  }

  // Si requiere rol y no coincide → Feed
  if (requiereRol && rolActual !== requiereRol) {
    return { name: 'Feed' }
  }

  return true
})

export default router
