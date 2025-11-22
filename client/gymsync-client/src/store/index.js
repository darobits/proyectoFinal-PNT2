import { createStore } from 'vuex'
import auth from './modules/auth'

export default createStore({
  modules: {
    auth
  },
  state: {
    sidebarVisible: true
  },
  mutations: {
    toggleSidebar(state) {
      state.sidebarVisible = !state.sidebarVisible
    },
    setSidebar(state, value) {
      state.sidebarVisible = value
    }
  }
})
