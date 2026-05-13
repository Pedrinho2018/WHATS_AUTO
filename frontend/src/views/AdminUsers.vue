<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'

interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'manager' | 'agent' | 'viewer'
  is_active: boolean
}

const users = ref<User[]>([])
const loading = ref(true)
const isSaving = ref(false)
const error = ref('')
const success = ref('')
const searchQuery = ref('')

const form = ref({
  name: '',
  email: '',
  password: '',
  role: 'agent' as User['role'],
})

const roleLabels: Record<User['role'], string> = {
  admin: 'Admin',
  manager: 'Gestor',
  agent: 'Agente',
  viewer: 'Leitura',
}

const filteredUsers = computed(() => {
  const term = searchQuery.value.trim().toLowerCase()

  if (!term) return users.value

  return users.value.filter((user) => {
    return [user.name, user.email, roleLabels[user.role]].some((field) => field.toLowerCase().includes(term))
  })
})

const stats = computed(() => {
  const total = users.value.length
  const active = users.value.filter((user) => user.is_active).length
  const inactive = total - active
  const admins = users.value.filter((user) => user.role === 'admin').length

  return { total, active, inactive, admins }
})

const loadUsers = async () => {
  loading.value = true
  error.value = ''

  try {
    const { data } = await api.get('/users')
    users.value = data
  } catch {
    error.value = 'Não foi possível carregar os usuários no momento.'
  } finally {
    loading.value = false
  }
}

const createUser = async () => {
  if (!form.value.name || !form.value.email || !form.value.password) {
    error.value = 'Preencha nome, email e senha para cadastrar o usuário.'
    return
  }

  isSaving.value = true
  error.value = ''
  success.value = ''

  try {
    await api.post('/users', form.value)
    form.value = { name: '', email: '', password: '', role: 'agent' }
    success.value = 'Usuário cadastrado com sucesso.'
    await loadUsers()
  } catch (err: any) {
    if (err.response && err.response.data && err.response.data.error) {
      error.value = err.response.data.error
    } else {
      error.value = 'Não foi possível cadastrar o usuário.'
    }
  } finally {
    isSaving.value = false
  }
}

const toggleUser = async (user: User) => {
  isSaving.value = true
  error.value = ''
  success.value = ''

  try {
    await api.patch(`/users/${user.id}`, { is_active: !user.is_active })
    success.value = user.is_active ? 'Usuário desativado.' : 'Usuário ativado.'
    await loadUsers()
  } catch {
    error.value = 'Não foi possível atualizar este usuário.'
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  await loadUsers()
})
</script>

<template>
  <div class="admin-users-page">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <p class="page-label">Admin • Equipe e Agentes</p>
        <h1 class="page-title">Gerenciar Usuários</h1>
        <p class="page-description">
          Cadastre novos usuários, controle papéis e altere o status de acesso.
        </p>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card glass">
        <div class="stat-icon stat-icon-primary">
          <svg class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div class="stat-content">
          <p class="stat-label">Total</p>
          <p class="stat-value">{{ stats.total }}</p>
        </div>
      </div>

      <div class="stat-card glass">
        <div class="stat-icon stat-icon-success">
          <svg class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="stat-content">
          <p class="stat-label">Ativos</p>
          <p class="stat-value">{{ stats.active }}</p>
        </div>
      </div>

      <div class="stat-card glass">
        <div class="stat-icon stat-icon-warning">
          <svg class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <div class="stat-content">
          <p class="stat-label">Inativos</p>
          <p class="stat-value">{{ stats.inactive }}</p>
        </div>
      </div>

      <div class="stat-card glass">
        <div class="stat-icon stat-icon-admin">
          <svg class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div class="stat-content">
          <p class="stat-label">Admins</p>
          <p class="stat-value">{{ stats.admins }}</p>
        </div>
      </div>
    </div>

    <!-- Content Grid -->
    <div class="content-grid">
      <!-- Users List Section -->
      <section class="users-section glass">
        <div class="section-header">
          <div>
            <p class="section-label">Base de acesso</p>
            <h2 class="section-title">Usuários cadastrados</h2>
          </div>

          <div class="search-wrapper">
            <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              v-model="searchQuery" 
              type="text" 
              class="search-input" 
              placeholder="Buscar por nome, email ou perfil" 
            />
          </div>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          Carregando usuários...
        </div>

        <div v-else class="users-list">
          <div v-if="filteredUsers.length === 0" class="empty-state">
            <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Nenhum usuário encontrado com o filtro atual.
          </div>

          <article
            v-for="(user, index) in filteredUsers"
            :key="user.id"
            class="user-card"
            :style="{ animationDelay: `${index * 0.05}s` }"
          >
            <div class="user-info">
              <div class="user-avatar gradient-avatar">
                {{ user.name.charAt(0).toUpperCase() }}
              </div>

              <div class="user-details">
                <div class="user-badges">
                  <p class="user-name">{{ user.name }}</p>
                  <span 
                    class="status-badge"
                    :class="user.is_active ? 'badge-active' : 'badge-inactive'"
                  >
                    {{ user.is_active ? 'Ativo' : 'Inativo' }}
                  </span>
                  <span class="role-badge">
                    {{ roleLabels[user.role] }}
                  </span>
                </div>
                <p class="user-email">{{ user.email }}</p>
              </div>
            </div>

            <button
              class="btn-toggle"
              :disabled="isSaving"
              @click="toggleUser(user)"
            >
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-if="user.is_active" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ user.is_active ? 'Desativar' : 'Ativar' }}
            </button>
          </article>
        </div>
      </section>

      <!-- Create User Form Section -->
      <section class="form-section glass">
        <div class="form-header">
          <p class="section-label gradient-text">Novo usuário</p>
          <h2 class="section-title">Cadastrar acesso</h2>
          <p class="section-description">Preencha os dados do usuário e escolha o nível de acesso.</p>
        </div>

        <div v-if="error" class="alert alert-error">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ error }}
        </div>

        <div v-if="success" class="alert alert-success">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ success }}
        </div>

        <form class="user-form" @submit.prevent="createUser">
          <label class="form-field">
            <span class="field-label">Nome completo</span>
            <input 
              v-model="form.name" 
              class="field-input" 
              placeholder="Ex: João Silva" 
            />
          </label>

          <label class="form-field">
            <span class="field-label">Email</span>
            <input 
              v-model="form.email" 
              type="email"
              class="field-input" 
              placeholder="joao.silva@empresa.com" 
            />
          </label>

          <label class="form-field">
            <span class="field-label">Senha inicial</span>
            <input 
              v-model="form.password" 
              type="password" 
              class="field-input" 
              placeholder="Mínimo 6 caracteres" 
            />
          </label>

          <label class="form-field">
            <span class="field-label">Perfil de acesso</span>
            <select v-model="form.role" class="field-input">
              <option value="agent">Agente - Atendimento básico</option>
              <option value="manager">Gestor - Supervisão e relatórios</option>
              <option value="viewer">Leitura - Apenas visualização</option>
              <option value="admin">Admin - Acesso total</option>
            </select>
          </label>

          <button
            type="submit"
            :disabled="isSaving"
            class="btn-submit gradient-btn"
          >
            <div v-if="isSaving" class="spinner-sm"></div>
            <svg v-else class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            {{ isSaving ? 'Salvando...' : 'Cadastrar usuário' }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Base Styles */
.admin-users-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: fade-in 0.6s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Page Header */
.page-header {
  margin-bottom: 0.5rem;
}

.page-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-weight: 600;
  margin: 0;
}

.page-title {
  margin-top: 0.5rem;
  font-size: 2rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.2;
  margin-bottom: 0.5rem;
}

.page-description {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  max-width: 42rem;
  margin: 0;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: var(--border-radius-lg);
  transition: all 0.3s ease;
  animation: slide-up 0.6s ease-out backwards;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stat-card:nth-child(1) { animation-delay: 0s; }
.stat-card:nth-child(2) { animation-delay: 0.1s; }
.stat-card:nth-child(3) { animation-delay: 0.2s; }
.stat-card:nth-child(4) { animation-delay: 0.3s; }

.glass {
  background: var(--glass-background);
  backdrop-filter: var(--glass-blur);
  border: 1px solid rgba(var(--v-border-color), 0.2);
  box-shadow: var(--shadow-lg);
}

.stat-card:hover {
  border-color: rgba(var(--v-border-color), 0.3);
  box-shadow: var(--shadow-xl);
  transform: translateY(-2px);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: var(--border-radius-md);
  color: white;
  flex-shrink: 0;
}

.stat-icon-primary {
  background: var(--gradient-brand);
  box-shadow: 0 4px 12px rgba(var(--color-primary-500), 0.3);
}

.stat-icon-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.stat-icon-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.stat-icon-admin {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.icon-sm {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.icon-md {
  width: 1.5rem;
  height: 1.5rem;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin: 0 0 0.25rem 0;
}

.stat-value {
  font-size: 1.875rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
  line-height: 1;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* Users Section */
.users-section {
  padding: 1.5rem;
  border-radius: var(--border-radius-lg);
  animation: slide-up 0.6s ease-out 0.4s backwards;
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 640px) {
  .section-header {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
}

.section-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-weight: 600;
  margin: 0;
}

.section-title {
  margin-top: 0.375rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 0;
}

.section-description {
  margin-top: 0.375rem;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-bottom: 0;
}

.search-wrapper {
  position: relative;
  width: 100%;
  max-width: 20rem;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-lg);
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
  outline: none;
  transition: all 0.3s ease;
}

.search-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.search-input:focus {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  background: rgba(var(--v-theme-surface), 0.3);
  border: 1px dashed rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-lg);
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  text-align: center;
}

.spinner {
  width: 2rem;
  height: 2rem;
  margin-bottom: 0.75rem;
  border: 3px solid rgba(var(--v-theme-primary), 0.2);
  border-top-color: rgb(var(--v-theme-primary));
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  margin-bottom: 0.75rem;
  opacity: 0.5;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.user-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: rgba(var(--v-theme-surface), 0.3);
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: var(--border-radius-lg);
  transition: all 0.3s ease;
  animation: slide-in 0.5s ease-out backwards;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (min-width: 640px) {
  .user-card {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.user-card:hover {
  background: rgba(var(--v-theme-surface), 0.5);
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.user-info {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: var(--border-radius-lg);
  font-size: 1.125rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.gradient-avatar {
  background: var(--gradient-brand);
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
}

.user-name {
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

.status-badge,
.role-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.badge-active {
  background: rgba(var(--color-success-500), 0.15);
  color: var(--color-success-700);
}

.badge-inactive {
  background: rgba(var(--v-theme-on-surface), 0.1);
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.role-badge {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.user-email {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-lg);
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-toggle:hover:not(:disabled) {
  background: rgba(var(--v-theme-surface), 0.8);
  border-color: rgba(var(--v-theme-primary), 0.4);
  box-shadow: var(--shadow-sm);
}

.btn-toggle:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Form Section */
.form-section {
  padding: 1.5rem;
  border-radius: var(--border-radius-lg);
  animation: slide-up 0.6s ease-out 0.5s backwards;
}

.form-header {
  margin-bottom: 1.5rem;
}

.gradient-text {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.alert {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: var(--border-radius-lg);
  font-size: 0.875rem;
}

.alert-error {
  background: rgba(var(--color-error-500), 0.1);
  border: 1px solid rgba(var(--color-error-500), 0.3);
  color: var(--color-error-700);
}

.alert-success {
  background: rgba(var(--color-success-500), 0.1);
  border: 1px solid rgba(var(--color-success-500), 0.3);
  color: var(--color-success-700);
}

.user-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.field-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-lg);
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
  outline: none;
  transition: all 0.3s ease;
}

.field-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.field-input:focus {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
}

.gradient-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--gradient-brand);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  border-radius: var(--border-radius-lg);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-md);
  margin-top: 0.5rem;
}

.gradient-btn:hover:not(:disabled) {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.gradient-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner-sm {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  .glass {
    background: rgba(18, 18, 18, 0.7);
  }

  .user-card {
    background: rgba(30, 30, 30, 0.5);
  }

  .alert-error {
    color: var(--color-error-300);
  }

  .alert-success {
    color: var(--color-success-300);
  }
}
</style>
