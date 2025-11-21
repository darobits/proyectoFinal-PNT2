import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import axios from 'axios'

import 'bootstrap/dist/css/bootstrap.min.css'

// Base de la API (nuestro backend Express)
axios.defaults.baseURL = 'http://localhost:3000/api'

// Interceptor para mandar el token en cada request si existe
axios.interceptors.request.use((config) => {
  const token = store.state.auth?.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const app = createApp(App)

app.use(router)
app.use(store)

app.mount('#app')
