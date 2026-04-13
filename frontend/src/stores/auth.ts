import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Company, User } from '../domain/auth/AuthModels'
import { appContainer } from '../shared/di/container'
import { connectSocket, disconnectSocket } from '../services/socket'

export const useAuthStore = defineStore('auth', () => {
  const authService = appContainer.authService
  const user = ref<User | null>(null)
  const company = ref<Company | null>(null)
  const token = ref<string | null>(authService.getStoredToken())

  const isAuthenticated = computed(() => !!token.value)

  async function login(email: string, password: string) {
    const result = await authService.login(email, password)

    if (!result.ok) {
      return {
        success: false,
        error: result.error,
      }
    }

    user.value = result.data.user
    company.value = result.data.company
    token.value = result.data.token
    connectSocket()

    return { success: true }
  }

  async function fetchUser() {
    if (!token.value) return

    const result = await authService.fetchProfile()

    if (!result.ok) {
      logout()
      return
    }

    user.value = result.data.user
    company.value = result.data.company
    connectSocket()
  }

  function logout() {
    user.value = null
    company.value = null
    token.value = null
    authService.logout()
    disconnectSocket()
  }

  return {
    user,
    company,
    token,
    isAuthenticated,
    login,
    fetchUser,
    logout
  }
})