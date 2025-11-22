// src/store/modules/toast.js
export default {
  namespaced: true,

  state: () => ({
    visible: false,
    message: '',
    type: 'info',     // 'info' | 'success' | 'error'
    timeoutId: null
  }),

  mutations: {
    show(state, { message, type = 'info', duration = 3000 }) {
      state.message = message
      state.type = type
      state.visible = true

      // limpiar timeout anterior
      if (state.timeoutId) {
        clearTimeout(state.timeoutId)
      }

      state.timeoutId = setTimeout(() => {
        state.visible = false
        state.message = ''
        state.timeoutId = null
      }, duration)
    },

    hide(state) {
      state.visible = false
      state.message = ''
      if (state.timeoutId) {
        clearTimeout(state.timeoutId)
        state.timeoutId = null
      }
    }
  }
}
