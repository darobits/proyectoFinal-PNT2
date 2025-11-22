<!-- src/components/Toast.vue -->
<script setup>
import { computed, watch, ref, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'

const store = useStore()

const toast = computed(() => store.state.ui.toast)
const visible = computed(() => toast.value.visible)
const message = computed(() => toast.value.message)
const type = computed(() => toast.value.type || 'info')

const timeoutId = ref(null)

const hide = () => {
  store.commit('ui/hideToast')
}

watch(visible, (val) => {
  if (val) {
    if (timeoutId.value) clearTimeout(timeoutId.value)
    timeoutId.value = setTimeout(() => {
      hide()
    }, 3500)
  } else if (timeoutId.value) {
    clearTimeout(timeoutId.value)
    timeoutId.value = null
  }
})

onBeforeUnmount(() => {
  if (timeoutId.value) clearTimeout(timeoutId.value)
})
</script>

<template>
  <transition name="toast-fade">
    <div
      v-if="visible"
      class="toast"
      :class="{
        'toast--success': type === 'success',
        'toast--error': type === 'error',
        'toast--info': type === 'info'
      }"
    >
      <div class="toast__indicator" />
      <div class="toast__content">
        <span class="toast__message">{{ message }}</span>
      </div>
      <button class="toast__close" type="button" @click="hide">
        ×
      </button>
    </div>
  </transition>
</template>

<style scoped>
.toast {
  position: fixed;
  right: 1.8rem;
  bottom: 1.8rem;
  z-index: 9999;
  min-width: 260px;
  max-width: 360px;
  padding: 0.7rem 0.9rem;
  border-radius: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(148, 163, 184, 0.5);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.95);
  font-size: 0.85rem;
}

.toast__indicator {
  width: 6px;
  height: 100%;
  border-radius: 999px;
  background: #38bdf8;
}

.toast--success .toast__indicator {
  background: #22c55e;
}

.toast--error .toast__indicator {
  background: #ef4444;
}

.toast--info .toast__indicator {
  background: #38bdf8;
}

.toast__content {
  flex: 1;
}

.toast__message {
  color: var(--color-text);
}

.toast__close {
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.15rem 0.3rem;
}

.toast__close:hover {
  color: var(--color-primary);
}

/* animación */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
