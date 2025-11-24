<!-- src/views/FriendsView.vue -->
<template>
  <main class="friends-page">
    <section class="friends-card">
      <header class="friends-header">
        <div>
          <h1 class="friends-title">Comunidad GymSync</h1>
          <p class="friends-subtitle">
            Conectate con otros usuarios, enviá solicitudes de amistad y empezá a compartir tus rutinas.
          </p>
        </div>
      </header>

      <!-- TABS PRINCIPALES -->
      <nav class="friends-tabs">
        <button
          class="tab-pill"
          :class="{ 'tab-pill--active': activeTab === 'search' }"
          @click="activeTab = 'search'"
        >
          Buscar usuarios
        </button>
        <button
          class="tab-pill"
          :class="{ 'tab-pill--active': activeTab === 'requests' }"
          @click="activeTab = 'requests'"
        >
          Solicitudes
        </button>
        <button
          class="tab-pill"
          :class="{ 'tab-pill--active': activeTab === 'friends' }"
          @click="activeTab = 'friends'"
        >
          Mis amigos
        </button>
      </nav>

      <div class="friends-content">
        <!-- BUSCAR USUARIOS -->
        <section v-if="activeTab === 'search'" class="friends-section">
          <h2 class="section-title">Buscar usuarios</h2>
          <p class="section-help">
            Ingresá un nombre o email para encontrar otros atletas de GymSync.
          </p>

          <div class="search-row">
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="Buscar por nombre o email..."
            />
            <button
              class="primary-btn"
              @click="searchUsers"
              :disabled="loadingSearch"
            >
              {{ loadingSearch ? 'Buscando...' : 'Buscar' }}
            </button>
          </div>

          <p
            v-if="searchResults.length === 0 && searchPerformed"
            class="empty-text"
          >
            No se encontraron usuarios que coincidan con tu búsqueda.
          </p>

          <ul v-else class="item-list">
            <li
              v-for="user in searchResults"
              :key="user.id"
              class="item-row"
            >
              <div class="item-main">
                <div class="avatar-circle">
                  {{ user.name?.charAt(0)?.toUpperCase() || 'U' }}
                </div>
                <div>
                  <strong class="item-name">{{ user.name }}</strong>
                  <div class="item-muted">{{ user.email }}</div>
                </div>
              </div>

              <div class="item-actions">
                <span v-if="user.id === currentUserId" class="badge badge--soft">
                  Vos
                </span>
                <span
                  v-else-if="isFriend(user.id)"
                  class="badge badge--success"
                >
                  Amigo
                </span>
                <span
                  v-else-if="isPendingSent(user.id)"
                  class="badge badge--warning"
                >
                  Pendiente
                </span>
                <button
                  v-else
                  class="outline-btn"
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
        <section v-if="activeTab === 'requests'" class="friends-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Solicitudes de amistad</h2>
              <p class="section-help">
                Aceptá o rechazá nuevas solicitudes, o revisá las que enviaste.
              </p>
            </div>

            <div class="subtabs">
              <button
                class="subtab-pill"
                :class="{ 'subtab-pill--active': activeRequestsTab === 'received' }"
                @click="activeRequestsTab = 'received'"
              >
                Recibidas
              </button>
              <button
                class="subtab-pill"
                :class="{ 'subtab-pill--active': activeRequestsTab === 'sent' }"
                @click="activeRequestsTab = 'sent'"
              >
                Enviadas
              </button>
            </div>
          </div>

          <!-- Recibidas -->
          <div v-if="activeRequestsTab === 'received'">
            <p v-if="requests.received.length === 0" class="empty-text">
              No tenés solicitudes pendientes por ahora.
            </p>

            <ul v-else class="item-list">
              <li
                v-for="req in requests.received"
                :key="req.id"
                class="item-row"
              >
                <div class="item-main">
                  <div class="avatar-circle">
                    {{ (req.fromUser?.name || 'U').charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <strong class="item-name">
                      {{ req.fromUser?.name || 'Usuario' }}
                    </strong>
                    <div class="item-muted">
                      {{ req.fromUser?.email }}
                    </div>
                  </div>
                </div>
                <div class="item-actions">
                  <button
                    class="primary-btn primary-btn--small"
                    @click="acceptRequest(req.id)"
                    :disabled="loadingRequests"
                  >
                    Aceptar
                  </button>
                  <button
                    class="danger-btn danger-btn--ghost"
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
            <p v-if="requests.sent.length === 0" class="empty-text">
              No enviaste solicitudes recientemente.
            </p>

            <ul v-else class="item-list">
              <li
                v-for="req in requests.sent"
                :key="req.id"
                class="item-row"
              >
                <div class="item-main">
                  <div class="avatar-circle">
                    {{ (req.toUser?.name || 'U').charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <strong class="item-name">
                      {{ req.toUser?.name || 'Usuario' }}
                    </strong>
                    <div class="item-muted">
                      {{ req.toUser?.email }}
                    </div>
                  </div>
                </div>
                <div class="item-actions">
                  <span class="badge badge--warning">Pendiente</span>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <!-- MIS AMIGOS -->
        <section v-if="activeTab === 'friends'" class="friends-section">
          <h2 class="section-title">Mis amigos</h2>
          <p class="section-help">
            Chateá con tus amigos y compartan progresos, rutinas y objetivos.
          </p>

          <p v-if="friends.length === 0" class="empty-text">
            Todavía no tenés amigos en GymSync. Buscá usuarios y enviá solicitudes desde la pestaña
            <strong>Buscar usuarios</strong>.
          </p>

          <ul v-else class="item-list">
            <li
              v-for="friend in friends"
              :key="friend.id"
              class="item-row"
            >
              <div class="item-main">
                <div class="avatar-circle">
                  {{ friend.name?.charAt(0)?.toUpperCase() || 'U' }}
                </div>
                <div>
                  <strong class="item-name">{{ friend.name }}</strong>
                  <div class="item-muted">{{ friend.email }}</div>
                </div>
              </div>
              <div class="item-actions">
                <button class="primary-btn primary-btn--ghost" @click="goToChat(friend.id)">
                  Mensajes
                </button>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </section>
  </main>
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

// Helpers
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
    // filtramos admin por las dudas
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
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1.5rem;
}

.friends-card {
  width: 100%;
  max-width: 980px;
  background: radial-gradient(circle at top, rgba(37, 99, 235, 0.28), transparent 55%),
              radial-gradient(circle at bottom, rgba(16, 185, 129, 0.18), transparent 55%),
              rgba(15, 23, 42, 0.96);
  border-radius: 1.5rem;
  padding: 1.8rem 2rem 2.1rem;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.32);
  color: #e5e7eb;
}

.friends-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.friends-title {
  font-size: 1.6rem;
  font-weight: 700;
}

.friends-subtitle {
  margin-top: 0.2rem;
  font-size: 0.9rem;
  color: #a5b4fc;
}

/* Tabs principales */
.friends-tabs {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(75, 85, 99, 0.9);
  margin-bottom: 1.4rem;
}

.tab-pill {
  border: none;
  background: transparent;
  color: #9ca3af;
  font-size: 0.85rem;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease;
}

.tab-pill--active {
  background: linear-gradient(135deg, #2563eb, #22c55e);
  color: #f9fafb;
}

/* Contenido */
.friends-content {
  background: rgba(15, 23, 42, 0.92);
  border-radius: 1.2rem;
  padding: 1.3rem 1.4rem 1.5rem;
  border: 1px solid rgba(30, 64, 175, 0.4);
}

/* Secciones */
.friends-section + .friends-section {
  margin-top: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.section-title {
  font-size: 1.05rem;
  margin-bottom: 0.2rem;
}

.section-help {
  margin: 0;
  font-size: 0.85rem;
  color: #9ca3af;
}

/* Subtabs (recibidas / enviadas) */
.subtabs {
  display: inline-flex;
  padding: 0.15rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(55, 65, 81, 0.9);
}

.subtab-pill {
  border: none;
  background: transparent;
  color: #9ca3af;
  font-size: 0.78rem;
  padding: 0.28rem 0.7rem;
  border-radius: 999px;
  cursor: pointer;
}

.subtab-pill--active {
  background: rgba(37, 99, 235, 0.9);
  color: #f9fafb;
}

/* Buscador */
.search-row {
  display: flex;
  gap: 0.75rem;
  margin: 1rem 0 0.8rem;
}

.search-input {
  flex: 1;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(48, 61, 92, 0.95);
  padding: 0.55rem 0.9rem;
  font-size: 0.9rem;
  color: #e5e7eb;
}

.search-input::placeholder {
  color: #6b7280;
}

/* Lista / items */
.item-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.85rem;
  border-radius: 0.9rem;
  background: radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 55%),
              rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(55, 65, 81, 0.7);
}

.item-main {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 30% 20%, #22c55e, #2563eb);
  font-weight: 700;
  font-size: 1rem;
  color: #f9fafb;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.9);
}

.item-name {
  font-size: 0.95rem;
}

.item-muted {
  font-size: 0.8rem;
  color: #9ca3af;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

/* Botones / badges */
.primary-btn {
  border-radius: 999px;
  border: none;
  padding: 0.5rem 1.2rem;
  background: linear-gradient(135deg, #2563eb, #22c55e);
  color: #f9fafb;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.9);
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
}

.primary-btn--small {
  padding: 0.4rem 0.9rem;
  font-size: 0.8rem;
}

.primary-btn--ghost {
  background: transparent;
  border: 1px solid rgba(56, 189, 248, 0.8);
  box-shadow: none;
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 1);
  filter: brightness(1.05);
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.outline-btn {
  border-radius: 999px;
  border: 1px solid rgba(56, 189, 248, 0.9);
  background: transparent;
  padding: 0.35rem 0.9rem;
  font-size: 0.8rem;
  color: #e5e7eb;
  cursor: pointer;
}

.danger-btn {
  border-radius: 999px;
  border: none;
  padding: 0.4rem 0.9rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.danger-btn--ghost {
  background: transparent;
  border: 1px solid rgba(248, 113, 113, 0.9);
  color: #fecaca;
}

.badge {
  border-radius: 999px;
  padding: 0.22rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge--soft {
  background: rgba(148, 163, 184, 0.26);
  color: #e5e7eb;
}

.badge--success {
  background: rgba(34, 197, 94, 0.22);
  color: #bbf7d0;
}

.badge--warning {
  background: rgba(249, 115, 22, 0.22);
  color: #fed7aa;
}

.empty-text {
  margin-top: 0.6rem;
  font-size: 0.86rem;
  color: #9ca3af;
}

/* Responsive */
@media (max-width: 900px) {
  .friends-card {
    padding: 1.4rem 1.2rem 1.6rem;
  }

  .friends-header {
    flex-direction: column;
  }

  .friends-page {
    padding: 1.5rem 1rem;
  }

  .search-row {
    flex-direction: column;
  }

  .item-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .item-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
