<template>
  <div class="messages-page">

    <!-- HEADER SUPERIOR -->
    <div class="header-row">
      <button class="back-btn" @click="volver">
        ← Volver a amigos
      </button>

      <div class="header-text">
        <h1 class="page-title">Mensajes</h1>
        <p v-if="friend" class="page-subtitle">
          Chateando con <strong>{{ friend.name }}</strong>
          <span class="page-subtitle-email">({{ friend.email }})</span>
        </p>
      </div>
    </div>

    <!-- CARD PRINCIPAL -->
    <section class="messages-card">

      <!-- INFO DEL AMIGO EN EL TOP DEL CARD -->
      <div v-if="friend" class="chat-header">
        <div class="chat-avatar">
          {{ friendInitial }}
        </div>
        <div class="chat-meta">
          <div class="chat-name">{{ friend.name }}</div>
          <div class="chat-email">{{ friend.email }}</div>
        </div>
      </div>

      <!-- LISTA DE MENSAJES -->
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

      <!-- INPUT PARA ENVIAR MENSAJE -->
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

const api = axios.create({ baseURL: 'http://localhost:3000/api' })

// estado
const messages = ref([])
const loading = ref(false)
const sending = ref(false)
const newMessage = ref('')

// datos del amigo
const friend = ref(null)
const friendInitial = computed(
  () => friend.value?.name?.charAt(0)?.toUpperCase() || '?'
)

// cargar datos del amigo usando GET /users
const loadFriend = async () => {
  if (!friendId.value) return
  try {
    const { data } = await api.get('/users', authConfig.value)
    friend.value = data.find(u => u.id === friendId.value) || null
  } catch (error) {
    console.error(error)
    showToast('No se pudieron cargar los datos del usuario.', 'error')
  }
}

// cargar mensajes
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
    showToast(error.response?.data?.message || 'Error al cargar mensajes', 'error')
  } finally {
    loading.value = false
  }
}

// enviar mensaje
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
    messages.value.push(data)
    newMessage.value = ''
  } catch (error) {
    console.error(error)
    showToast(error.response?.data?.message || 'No se pudo enviar el mensaje', 'error')
  } finally {
    sending.value = false
  }
}

// formato de hora
const formatDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const volver = () => router.push({ name: 'Friends' })

onMounted(async () => {
  await Promise.all([loadFriend(), loadMessages()])
})
</script>

<style scoped>
/* ==== PAGE CONTAINER ==== */
.messages-page {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  padding: 1rem;
  color: #e5e7eb;
}

/* ==== HEADER ==== */
.header-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  padding: 0.45rem 1rem;
  border-radius: 999px;
  border: none;
  background: rgba(15, 23, 42, 0.8);
  color: #e5e7eb;
  cursor: pointer;
  font-size: 0.85rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
}

.back-btn:hover {
  background: rgba(30, 41, 59, 0.95);
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.page-title {
  font-size: 1.9rem;
  font-weight: 700;
  color: #f1f5f9;
}

.page-subtitle {
  font-size: 0.9rem;
  color: #a5b4fc;
}

.page-subtitle-email {
  color: #94a3b8;
}

/* ==== CARD ==== */
.messages-card {
  background: radial-gradient(circle at top, rgba(37, 99, 235, 0.25), transparent 60%),
              radial-gradient(circle at bottom, rgba(16, 185, 129, 0.2), transparent 60%),
              rgba(15, 23, 42, 0.95);
  border-radius: 1.3rem;
  padding: 1.5rem;
  box-shadow: 0 25px 70px rgba(0,0,0,0.7);
  border: 1px solid rgba(148,163,184,0.25);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

/* ==== CHAT HEADER (INFO DEL AMIGO) ==== */
.chat-header {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding-bottom: 0.8rem;
  margin-bottom: 0.6rem;
  border-bottom: 1px solid rgba(148,163,184,0.15);
}

.chat-avatar {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 30% 20%, #22c55e, #2563eb);
  font-weight: 700;
  font-size: 1rem;
  color: #f9fafb;
  box-shadow: 0 10px 25px rgba(0,0,0,0.45);
}

.chat-meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.chat-name {
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
}

.chat-email {
  font-size: 0.8rem;
  color: #94a3b8;
}

/* ==== MESSAGES LIST ==== */
.messages-container {
  min-height: 220px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.empty {
  color: #a5b4fc;
  text-align: center;
  font-size: 0.95rem;
  margin-top: 1rem;
}

.messages-list {
  list-style: none;
  padding: 0;
  margin: 0.6rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

/* BUBBLES */
.message-item {
  display: flex;
}

.message--mine { justify-content: flex-end; }
.message--theirs { justify-content: flex-start; }

.message-bubble {
  max-width: 70%;
  padding: 0.6rem 1rem;
  border-radius: 1rem;
  background: rgba(2, 6, 23, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.25);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  box-shadow: 0 8px 20px rgba(0,0,0,0.5);
}

.message--mine .message-bubble {
  background: linear-gradient(135deg, #2563eb, #22c55e);
  border: none;
}

/* inside bubble */
.message-text {
  font-size: 0.92rem;
  word-wrap: break-word;
  color: #f1f5f9;
}

.message-time {
  font-size: 0.7rem;
  opacity: 0.8;
  align-self: flex-end;
}

/* ==== INPUT SEND ==== */
.input-row {
  display: flex;
  gap: 0.7rem;
}

.input-row input {
  flex: 1;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(148,163,184,0.35);
  background: rgba(2,6,23,0.85);
  color: #e5e7eb;
  font-size: 0.9rem;
}

.input-row button {
  padding: 0.6rem 1.3rem;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #2563eb, #22c55e);
  color: #f1f5f9;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  box-shadow: 0 12px 30px rgba(0,0,0,0.6);
}

.input-row button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
