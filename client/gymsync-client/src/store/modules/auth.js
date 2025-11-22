import axios from 'axios'

export default {
  namespaced: true,
  state: () => ({
    usuarioActual: null,
    token: null
  }),

  mutations: {
    setAuth(state, { usuario, token }) {
      state.usuarioActual = usuario
      state.token = token
    },
    logout(state) {
      state.usuarioActual = null
      state.token = null
    }
  },

  getters: {
    estaLogueado: (state) => !!state.usuarioActual,
    rolActual: (state) => state.usuarioActual?.role || null
  },

  actions: {
    // REGISTRO: solo crea el usuario, NO lo deja logueado
    async register(_, payload) {
      await axios.post('/auth/register', payload)
    },

    // LOGIN: setea usuario + token (incluye admin hardcodeado)
    async login({ commit }, payload) {
      const { email, password } = payload

      // 👉 ADMIN HARCODEADO
      if (email === 'admin@gymsync.com' && password === 'admin123') {
        const usuarioAdmin = {
          name: 'Admin GymSync',
          email,
          role: 'ADMIN'
        }

        const fakeToken = 'fake-admin-token'

        commit('setAuth', { usuario: usuarioAdmin, token: fakeToken })
        return
      }

      // 👉 LOGIN NORMAL CONTRA EL BACKEND
      const { data } = await axios.post('/auth/login', payload)
      commit('setAuth', { usuario: data.usuario, token: data.token })
    }
  }
}
