import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import axios from 'axios'

import 'bootstrap/dist/css/bootstrap.min.css'
import './style.css'

// Base del backend
axios.defaults.baseURL = 'http://localhost:3000/api'

// Interceptor para adjuntar token si existe
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
