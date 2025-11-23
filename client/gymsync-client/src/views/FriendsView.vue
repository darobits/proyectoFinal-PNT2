<template>
  <div class="friends-page">
    <h1 class="page-title">Comunidad</h1>

    <div class="tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'search' }"
        @click="activeTab = 'search'"
      >
        Buscar usuarios
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'requests' }"
        @click="activeTab = 'requests'"
      >
        Solicitudes
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'friends' }"
        @click="activeTab = 'friends'"
      >
        Mis amigos
      </button>
    </div>

    <!-- BUSCAR USUARIOS -->
    <section v-if="activeTab === 'search'" class="card">
      <h2>Buscar usuarios</h2>
      <div class="search-row">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por nombre o email..."
        />
        <button @click="searchUsers" :disabled="loadingSearch">
          {{ loadingSearch ? 'Buscando...' : 'Buscar' }}
        </button>
      </div>

      <p v-if="searchResults.length === 0 && searchPerformed" class="empty">
        No se encontraron usuarios.
      </p>

      <ul v-else class="list">
        <li
          v-for="user in searchResults"
          :key="user.id"
          class="list-item"
        >
          <div>
            <strong>{{ user.name }}</strong>
            <div class="muted">{{ user.email }}</div>
          </div>
          <div class="actions">
            <span v-if="user.id === currentUserId" class="badge">
              Vos
            </span>
            <span v-else-if="isFriend(user.id)" class="badge success">
              Amigo
            </span>
            <span v-else-if="isPendingSent(user.id)" class="badge warning">
              Pendiente
            </span>
            <button
              v-else
              @click="sendFriendRequest(user.id)"
              :disabled="loadingRequests"
            >
              Agregar amigo
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- SOLICITUDES -->
    <section v-if="activeTab === 'requests'" class="card">
      <h2>Solicitudes</h2>

      <div class="subtabs">
        <button
          class="tab-btn small"
          :class="{ active: activeRequestsTab === 'received' }"
          @click="activeRequestsTab = 'received'"
        >
          Recibidas
        </button>
        <button
          class="tab-btn small"
          :class="{ active: activeRequestsTab === 'sent' }"
          @click="activeRequestsTab = 'sent'"
        >
          Enviadas
        </button>
      </div>

      <!-- Recibidas -->
      <div v-if="activeRequestsTab === 'received'">
        <p v-if="requests.received.length === 0" class="empty">
          No tenés solicitudes pendientes.
        </p>

        <ul v-else class="list">
          <li
            v-for="req in requests.received"
            :key="req.id"
            class="list-item"
          >
            <div>
              <strong>{{ req.fromUser?.name || 'Usuario' }}</strong>
              <div class="muted">
                {{ req.fromUser?.email }}
              </div>
            </div>
            <div class="actions">
              <button
                class="btn-success"
                @click="acceptRequest(req.id)"
                :disabled="loadingRequests"
              >
                Aceptar
              </button>
              <button
                class="btn-danger"
                @click="rejectRequest(req.id)"
                :disabled="loadingRequests"
              >
                Rechazar
              </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Enviadas -->
      <div v-else>
        <p v-if="requests.sent.length === 0" class="empty">
          No enviaste solicitudes recientes.
        </p>

        <ul v-else class="list">
          <li
            v-for="req in requests.sent"
            :key="req.id"
            class="list-item"
          >
            <div>
              <strong>{{ req.toUser?.name || 'Usuario' }}</strong>
              <div class="muted">
                {{ req.toUser?.email }}
              </div>
            </div>
            <div class="actions">
              <span class="badge warning">Pendiente</span>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <!-- MIS AMIGOS -->
    <section v-if="activeTab === 'friends'" class="card">
      <h2>Mis amigos</h2>
      <p v-if="friends.length === 0" class="empty">
        Todavía no tenés amigos en GymSync. Buscá usuarios y enviá solicitudes.
      </p>

      <ul v-else class="list">
        <li
          v-for="friend in friends"
          :key="friend.id"
          class="list-item"
        >
          <div>
            <strong>{{ friend.name }}</strong>
            <div class="muted">{{ friend.email }}</div>
          </div>
          <div class="actions">
            <button @click="goToChat(friend.id)">
              Mensajes
            </button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useToast } from '../composables/useToast'

const store = useStore()
const router = useRouter()
const { showToast } = useToast()

const usuarioActual = computed(() => store.state.auth.usuarioActual)
const token = computed(() => store.state.auth.token)
const currentUserId = computed(() => usuarioActual.value?.id ?? null)

const authConfig = computed(() => ({
  headers: {
    Authorization: `Bearer ${token.value}`
  }
}))

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

const activeTab = ref('search')
const activeRequestsTab = ref('received')

const searchQuery = ref('')
const searchResults = ref([])
const searchPerformed = ref(false)

const friends = ref([])
const requests = ref({
  received: [],
  sent: []
})

const loadingSearch = ref(false)
const loadingRequests = ref(false)

// Helpers para estado
const isFriend = (userId) => {
  return friends.value.some(f => f.id === userId)
}

const isPendingSent = (userId) => {
  return requests.value.sent.some(req => req.toUserId === userId)
}

// Cargar datos iniciales
const loadFriends = async () => {
  if (!currentUserId.value) return

  try {
    const { data } = await api.get('/social/friends', {
      ...authConfig.value,
      params: { userId: currentUserId.value }
    })
    friends.value = data
  } catch (error) {
    console.error(error)
    showToast('Error al cargar amigos', 'error')
  }
}

const loadRequests = async () => {
  if (!currentUserId.value) return

  try {
    const { data } = await api.get('/social/requests', {
      ...authConfig.value,
      params: { userId: currentUserId.value }
    })
    requests.value = data
  } catch (error) {
    console.error(error)
    showToast('Error al cargar solicitudes', 'error')
  }
}

onMounted(async () => {
  await Promise.all([loadFriends(), loadRequests()])
})

// Buscar usuarios
const searchUsers = async () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    searchPerformed.value = true
    return
  }

  loadingSearch.value = true
  try {
    const { data } = await api.get(
      `/users?search=${encodeURIComponent(searchQuery.value.trim())}`,
      authConfig.value
    )
    // filtramos admin por las dudas en mayúscula
    searchResults.value = data.filter(u => u.role !== 'ADMIN')
    searchPerformed.value = true
  } catch (error) {
    console.error(error)
    showToast('Error al buscar usuarios', 'error')
  } finally {
    loadingSearch.value = false
  }
}

const sendFriendRequest = async (toUserId) => {
  if (!currentUserId.value) return

  loadingRequests.value = true
  try {
    await api.post(
      '/social/requests',
      { toUserId, userId: currentUserId.value },
      authConfig.value
    )
    showToast('Solicitud enviada', 'success')
    await loadRequests()
  } catch (error) {
    console.error(error)
    const msg = error.response?.data?.message || 'No se pudo enviar la solicitud'
    showToast(msg, 'error')
  } finally {
    loadingRequests.value = false
  }
}

const acceptRequest = async (requestId) => {
  if (!currentUserId.value) return

  loadingRequests.value = true
  try {
    await api.post(
      `/social/requests/${requestId}/accept`,
      { userId: currentUserId.value },
      authConfig.value
    )
    showToast('Solicitud aceptada', 'success')
    await Promise.all([loadFriends(), loadRequests()])
  } catch (error) {
    console.error(error)
    const msg = error.response?.data?.message || 'No se pudo aceptar la solicitud'
    showToast(msg, 'error')
  } finally {
    loadingRequests.value = false
  }
}

const rejectRequest = async (requestId) => {
  if (!currentUserId.value) return

  loadingRequests.value = true
  try {
    await api.post(
      `/social/requests/${requestId}/reject`,
      { userId: currentUserId.value },
      authConfig.value
    )
    showToast('Solicitud rechazada', 'success')
    await loadRequests()
  } catch (error) {
    console.error(error)
    const msg = error.response?.data?.message || 'No se pudo rechazar la solicitud'
    showToast(msg, 'error')
  } finally {
    loadingRequests.value = false
  }
}

const goToChat = (friendId) => {
  router.push({ name: 'Messages', params: { friendId } })
}
</script>

<style scoped>
.friends-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 700;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: #1e293b;
  color: #e5e7eb;
  font-size: 0.9rem;
}

.tab-btn.active {
  background: #22c55e;
  color: #0b1120;
  font-weight: 600;
}

.tab-btn.small {
  padding: 0.35rem 0.8rem;
  font-size: 0.8rem;
}

.card {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 1rem;
  padding: 1.2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.search-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.search-row input {
  flex: 1;
  padding: 0.55rem 0.8rem;
  border-radius: 999px;
  border: 1px solid #334155;
  background: #020617;
  color: #e5e7eb;
}

.search-row button {
  padding: 0.55rem 1rem;
  border-radius: 999px;
  border: none;
  background: #22c55e;
  color: #0b1120;
  cursor: pointer;
  font-weight: 600;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #020617;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
}

.muted {
  font-size: 0.8rem;
  color: #9ca3af;
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.actions button {
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: #3b82f6;
  color: #e5e7eb;
  font-size: 0.8rem;
}

.btn-success {
  background: #22c55e !important;
  color: #022c22 !important;
}

.btn-danger {
  background: #ef4444 !important;
  color: #fee2e2 !important;
}

.badge {
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: #1f2937;
  color: #e5e7eb;
}

.badge.success {
  background: #16a34a;
  color: #ecfdf5;
}

.badge.warning {
  background: #f97316;
  color: #fff7ed;
}

.empty {
  color: #9ca3af;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}
</style>
