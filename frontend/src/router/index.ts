import { createRouter, createWebHistory } from 'vue-router'
import { AuthIdentity } from '../domain/auth/AuthModels'
import { useAuthStore } from '../stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: string[]
  }
}

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/tickets',
    name: 'Tickets',
    component: () => import('../views/Tickets.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/instances',
    name: 'Instances',
    component: () => import('../views/Instances.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/flows',
    name: 'Flows',
    component: () => import('../views/Flows.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: () => import('../views/AdminUsers.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'manager'] }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation Guard
router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (authStore.isAuthenticated && !authStore.user) {
    await authStore.fetchUser()
  }
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return '/login'
  }

  if (to.meta.roles?.length) {
    if (!authStore.user) {
      return '/'
    }

    const identity = new AuthIdentity(authStore.user)
    if (!identity.hasAnyRole(to.meta.roles)) {
      return '/'
    }
  } else if (!to.meta.requiresAuth && authStore.isAuthenticated) {
    return '/'
  }

  return true
})

export default router