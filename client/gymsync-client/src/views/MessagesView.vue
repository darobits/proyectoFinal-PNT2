<template>
  <div class="messages-page">
    <div class="header-row">
      <button class="back-btn" @click="volver">
        ← Volver a amigos
      </button>
      <h1 class="page-title">Mensajes</h1>
    </div>

    <section class="card">
      <div class="messages-container">
        <p v-if="messages.length === 0" class="empty">
          Todavía no hay mensajes. Empezá la conversación 👋
        </p>

        <ul v-else class="messages-list">
          <li
            v-for="msg in messages"
            :key="msg.id"
            :class="[
              'message-item',
              msg.fromUserId === currentUserId ? 'message--mine' : 'message--theirs'
            ]"
          >
            <div class="message-bubble">
              <span class="message-text">{{ msg.content }}</span>
              <span class="message-time">
                {{ formatDate(msg.createdAt) }}
              </span>
            </div>
          </li>
        </ul>
      </div>

      <form class="input-row" @submit.prevent="sendMessage">
        <input
          v-model="newMessage"
          type="text"
          placeholder="Escribí tu mensaje..."
        />
        <button type="submit" :disabled="sending || !newMessage.trim()">
          {{ sending ? 'Enviando...' : 'Enviar' }}
        </button>
      </form>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useToast } from '../composables/useToast'

const store = useStore()
const route = useRoute()
const router = useRouter()
const { showToast } = useToast()

const usuarioActual = computed(() => store.state.auth.usuarioActual)
const token = computed(() => store.state.auth.token)
const currentUserId = computed(() => usuarioActual.value?.id ?? null)

const friendId = computed(() => Number(route.params.friendId))

const authConfig = computed(() => ({
  headers: {
    Authorization: `Bearer ${token.value}`
  }
}))

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

const messages = ref([])
const loading = ref(false)
const sending = ref(false)
const newMessage = ref('')

const loadMessages = async () => {
  if (!currentUserId.value || !friendId.value) return
  loading.value = true
  try {
    const { data } = await api.get(`/social/messages/${friendId.value}`, {
      ...authConfig.value,
      params: { userId: currentUserId.value }
    })
    messages.value = data
  } catch (error) {
    console.error(error)
    const msg = error.response?.data?.message || 'Error al cargar mensajes'
    showToast(msg, 'error')
  } finally {
    loading.value = false
  }
}

const sendMessage = async () => {
  const content = newMessage.value.trim()
  if (!content || !currentUserId.value || !friendId.value) return

  sending.value = true
  try {
    const { data } = await api.post(
      `/social/messages/${friendId.value}`,
      { content, userId: currentUserId.value },
      authConfig.value
    )
    // añadimos el mensaje recién creado al final
    messages.value.push(data)
    newMessage.value = ''
  } catch (error) {
    console.error(error)
    const msg = error.response?.data?.message || 'No se pudo enviar el mensaje'
    showToast(msg, 'error')
  } finally {
    sending.value = false
  }
}

const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

const volver = () => {
  router.push({ name: 'Friends' })
}

onMounted(() => {
  loadMessages()
})
</script>

<style scoped>
.messages-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: none;
  background: #1e293b;
  color: #e5e7eb;
  cursor: pointer;
  font-size: 0.85rem;
}

.back-btn:hover {
  background: #0f172a;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 700;
}

.card {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 1rem;
  padding: 1.2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.messages-container {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.empty {
  color: #9ca3af;
  font-size: 0.9rem;
  text-align: center;
  margin-top: 1rem;
}

.messages-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.message-item {
  display: flex;
}

.message--mine {
  justify-content: flex-end;
}

.message--theirs {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
  padding: 0.45rem 0.9rem;
  border-radius: 0.75rem;
  background: #0f172a;
  color: #e5e7eb;
  font-size: 0.9rem;
  display: inline-flex;
  flex-direction: column;
  gap: 0.2rem;
}

.message--mine .message-bubble {
  background: #3b82f6;
  color: #e5e7eb;
}

.message-text {
  word-wrap: break-word;
}

.message-time {
  font-size: 0.7rem;
  opacity: 0.8;
  align-self: flex-end;
}

.input-row {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.input-row input {
  flex: 1;
  padding: 0.55rem 0.8rem;
  border-radius: 999px;
  border: 1px solid #334155;
  background: #020617;
  color: #e5e7eb;
}

.input-row button {
  padding: 0.55rem 1rem;
  border-radius: 999px;
  border: none;
  background: #3b82f6;
  color: #e5e7eb;
  cursor: pointer;
  font-weight: 600;
}

.input-row button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
