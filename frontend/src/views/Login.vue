<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')
const showPassword = ref(false)

const canSubmit = computed(() => {
  return email.value.trim().length > 0 && password.value.trim().length > 0 && !isLoading.value
})

const handleLogin = async () => {
  if (!canSubmit.value) return

  isLoading.value = true
  error.value = ''

  try {
    const result = await authStore.login(email.value, password.value)

    if (result.success) {
      await router.replace('/')
      return
    }

    error.value = result.error || 'Erro ao fazer login'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <v-container class="login-shell" fluid>
    <div class="gradient-mesh"></div>
    
    <div class="login-layout">
      <section class="login-brand glass" aria-label="Norte MT Sistemas">
        <div class="brand-mark">
          <v-avatar class="gradient-avatar" size="44">
            <span class="font-weight-bold">NM</span>
          </v-avatar>
          <div>
            <div class="text-h6 font-weight-bold gradient-text">Norte MT Sistemas</div>
            <div class="text-body-2 text-medium-emphasis">Whats Auto</div>
          </div>
        </div>

        <div class="brand-content">
          <h1 class="brand-title">Atendimento, automacao e operacao em um unico painel.</h1>
          <p class="brand-copy">
            Acompanhe conversas, instancias e fluxos com uma interface mais direta para a rotina da equipe.
          </p>
        </div>

        <div class="brand-status">
          <div class="status-item">
            <span class="status-dot"></span>
            Sistema online
          </div>
          <div class="status-item">
            <v-icon size="16" class="mr-1">mdi-shield-check</v-icon>
            Ambiente seguro
          </div>
        </div>
      </section>

      <v-card class="login-card glass" elevation="0">
        <v-card-text class="pa-6 pa-sm-8">
          <div class="mb-6 card-header">
            <h2 class="text-h5 font-weight-bold mb-1">Entrar</h2>
            <p class="text-body-2 text-medium-emphasis">Use suas credenciais corporativas.</p>
          </div>

          <v-alert
            v-if="error"
            class="mb-5 error-alert"
            density="comfortable"
            icon="mdi-alert-circle-outline"
            type="error"
            variant="tonal"
          >
            {{ error }}
          </v-alert>

          <v-form class="login-form" @submit.prevent="handleLogin">
            <v-text-field
              v-model="email"
              autocomplete="email"
              class="mb-4 modern-input"
              color="primary"
              density="comfortable"
              hide-details="auto"
              label="Email"
              placeholder="admin@nortemtsistemas.com.br"
              prepend-inner-icon="mdi-email-outline"
              required
              type="email"
              variant="outlined"
            />

            <v-text-field
              v-model="password"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              class="mb-5 modern-input"
              color="primary"
              density="comfortable"
              hide-details="auto"
              label="Senha"
              prepend-inner-icon="mdi-lock-outline"
              required
              variant="outlined"
              @click:append-inner="showPassword = !showPassword"
            />

            <v-btn
              block
              class="text-none font-weight-bold gradient-button"
              :disabled="!canSubmit"
              size="large"
              type="submit"
            >
              <v-progress-circular v-if="isLoading" class="mr-2" color="white" indeterminate size="18" width="2" />
              {{ isLoading ? 'Validando...' : 'Entrar' }}
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<style scoped>
.login-shell {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(var(--v-theme-background));
  overflow: hidden;
}

.gradient-mesh {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(circle at 20% 30%, rgba(0, 102, 204, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(115, 0, 230, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(0, 188, 212, 0.1) 0%, transparent 50%);
  animation: mesh-shift 20s ease-in-out infinite;
  pointer-events: none;
}

@keyframes mesh-shift {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1) rotate(0deg);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1) rotate(5deg);
  }
}

.login-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(280px, 440px) minmax(320px, 440px);
  gap: 24px;
  width: min(100%, 960px);
  animation: fade-in-up 0.6s ease-out;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.glass {
  background: var(--glass-background) !important;
  backdrop-filter: var(--glass-blur);
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: var(--border-radius-lg);
}

.login-brand {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 420px;
  padding: 32px;
  transition: all 0.3s ease;
}

.login-brand:hover {
  border-color: rgba(var(--v-border-color), 0.3);
  box-shadow: var(--shadow-lg);
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gradient-avatar {
  background: var(--gradient-brand) !important;
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(0, 102, 204, 0);
  }
  50% {
    box-shadow: 0 0 20px 4px rgba(0, 102, 204, 0.3);
  }
}

.gradient-text {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.brand-title {
  max-width: 360px;
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.14;
  animation: fade-in 0.8s ease-out 0.2s backwards;
}

.brand-copy {
  max-width: 360px;
  margin-top: 16px;
  color: rgba(var(--v-theme-on-surface), 0.68);
  line-height: 1.6;
  animation: fade-in 0.8s ease-out 0.4s backwards;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.brand-status {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.875rem;
}

.status-item {
  display: flex;
  align-items: center;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 8px;
  border-radius: 50%;
  background: var(--color-success-500);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
  }
}

.login-card {
  align-self: center;
  transition: all 0.3s ease;
}

.login-card:hover {
  border-color: rgba(var(--v-border-color), 0.3);
  box-shadow: var(--shadow-xl);
  transform: translateY(-2px);
}

.card-header {
  animation: fade-in 0.8s ease-out 0.6s backwards;
}

.error-alert {
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-8px);
  }
  75% {
    transform: translateX(8px);
  }
}

.modern-input :deep(.v-field) {
  background: rgba(var(--v-theme-surface), 0.5);
  border-radius: var(--border-radius-md);
  transition: all 0.3s ease;
}

.modern-input :deep(.v-field:hover) {
  background: rgba(var(--v-theme-surface), 0.7);
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: var(--shadow-sm);
}

.modern-input :deep(.v-field--focused) {
  background: rgba(var(--v-theme-surface), 0.9);
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
}

.gradient-button {
  background: var(--gradient-brand) !important;
  color: white !important;
  border-radius: var(--border-radius-md);
  transition: all 0.3s ease;
  box-shadow: var(--shadow-md);
}

.gradient-button:not(:disabled):hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.gradient-button:not(:disabled):active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

.gradient-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 860px) {
  .login-layout {
    grid-template-columns: 1fr;
    max-width: 440px;
  }

  .login-brand {
    min-height: auto;
    gap: 32px;
  }

  .brand-title {
    font-size: 1.75rem;
  }
}

@media (prefers-color-scheme: dark) {
  .glass {
    background: rgba(18, 18, 18, 0.7) !important;
  }

  .gradient-mesh {
    opacity: 0.4;
  }
}
</style>
