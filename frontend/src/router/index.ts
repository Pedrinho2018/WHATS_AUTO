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
    path: '/design-system',
    name: 'DesignSystemShowcase',
    component: () => import('../views/DesignSystemShowcase.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'manager'] }
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('../views/Onboarding.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'manager'] }
  },
  {
    path: '/tickets',
    name: 'Tickets',
    component: () => import('../views/Tickets.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'manager'] }
  },
  {
    path: '/operator/queue',
    name: 'OperatorQueue',
    component: () => import('../views/OperatorQueue.vue'),
    meta: { requiresAuth: true, roles: ['agent', 'viewer'] }
  },
  {
    path: '/instances',
    name: 'Instances',
    component: () => import('../views/Instances.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'manager'] }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'manager'] }
  },
  {
    path: '/templates',
    name: 'MessageTemplates',
    component: () => import('../views/MessageTemplates.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'manager'] }
  },
  {
    path: '/diagnostics',
    name: 'Diagnostics',
    component: () => import('../views/Diagnostics.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'manager'] }
  },
  {
    path: '/builder',
    name: 'TypebotBuilder',
    component: () => import('../views/TypebotBuilder.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'manager'] }
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

const getHomeByRole = (role?: string): string => {
  if (role === 'agent' || role === 'viewer') {
    return '/operator/queue'
  }

  return '/'
}

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
      return '/login'
    }

    const identity = new AuthIdentity(authStore.user)
    if (!identity.hasAnyRole(to.meta.roles)) {
      return getHomeByRole(authStore.user.role)
    }
  } else if (!to.meta.requiresAuth && authStore.isAuthenticated) {
    return getHomeByRole(authStore.user?.role)
  }

  return true
})

export default router
