// src/store/modules/ui.js
export default {
  namespaced: true,

  state: () => ({
    toast: {
      visible: false,
      message: '',
      type: 'info' // 'success' | 'error' | 'info'
    }
  }),

  mutations: {
    showToast(state, { message, type = 'info' }) {
      state.toast.visible = true
      state.toast.message = message
      state.toast.type = type
    },
    hideToast(state) {
      state.toast.visible = false
      state.toast.message = ''
      state.toast.type = 'info'
    }
  }
}
