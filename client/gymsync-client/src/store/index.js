// src/store/index.js
import { createStore } from 'vuex'
import auth from './modules/auth'
import ui from './modules/ui'
import toast from './modules/toast'   // 👈 NUEVO

export default createStore({
  state: {
    sidebarVisible: true
  },

  mutations: {
    toggleSidebar(state) {
      state.sidebarVisible = !state.sidebarVisible
    }
  },

  modules: {
    auth,
    ui,
    toast                     // 👈 REGISTRAMOS EL MÓDULO
  }
})
