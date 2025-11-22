// src/composables/useToast.js
import { computed } from 'vue'
import { useStore } from 'vuex'

export function useToast() {
  const store = useStore()

  const toast = computed(() => store.state.toast)

  const showToast = ({ message, type = 'info', duration = 3000 }) => {
    store.commit('toast/show', { message, type, duration })
  }

  const hideToast = () => {
    store.commit('toast/hide')
  }

  return {
    toast,
    showToast,
    hideToast
  }
}
