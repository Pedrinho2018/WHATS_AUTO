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
    <div class="login-layout">
      <section class="login-brand" aria-label="Norte MT Sistemas">
        <div class="brand-mark">
          <v-avatar color="primary" size="44">
            <span class="font-weight-bold">NM</span>
          </v-avatar>
          <div>
            <div class="text-h6 font-weight-bold">Norte MT Sistemas</div>
            <div class="text-body-2 text-medium-emphasis">Whats Auto</div>
          </div>
        </div>

        <div>
          <h1 class="brand-title">Atendimento, automacao e operacao em um unico painel.</h1>
          <p class="brand-copy">
            Acompanhe conversas, instancias e fluxos com uma interface mais direta para a rotina da equipe.
          </p>
        </div>

        <div class="brand-status">
          <div>
            <span class="status-dot"></span>
            Sistema online
          </div>
          <div>Ambiente seguro</div>
        </div>
      </section>

      <v-card class="login-card" border elevation="0">
        <v-card-text class="pa-6 pa-sm-8">
          <div class="mb-6">
            <h2 class="text-h5 font-weight-bold mb-1">Entrar</h2>
            <p class="text-body-2 text-medium-emphasis">Use suas credenciais corporativas.</p>
          </div>

          <v-alert
            v-if="error"
            class="mb-5"
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
              class="mb-4"
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
              class="mb-5"
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
              class="text-none font-weight-bold"
              color="primary"
              :disabled="!canSubmit"
              size="large"
              type="submit"
              variant="flat"
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
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(var(--v-theme-background));
}

.login-layout {
  display: grid;
  grid-template-columns: minmax(280px, 440px) minmax(320px, 440px);
  gap: 24px;
  width: min(100%, 960px);
}

.login-brand,
.login-card {
  border-radius: 8px;
}

.login-brand {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 420px;
  padding: 32px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-title {
  max-width: 360px;
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.14;
}

.brand-copy {
  max-width: 360px;
  margin-top: 16px;
  color: rgba(var(--v-theme-on-surface), 0.68);
  line-height: 1.6;
}

.brand-status {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.875rem;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 8px;
  border-radius: 999px;
  background: rgb(var(--v-theme-success));
}

.login-card {
  align-self: center;
}

.login-form :deep(.v-field) {
  border-radius: 8px;
}

@media (max-width: 860px) {
  .login-layout {
    grid-template-columns: 1fr;
  }

  .login-brand {
    min-height: auto;
    gap: 32px;
  }
}
</style>
