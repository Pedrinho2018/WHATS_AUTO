export type UserRole = 'admin' | 'manager' | 'agent' | string

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  avatar?: string
}

export interface Company {
  id: number
  name: string
  subdomain: string
  plan: string
  status: string
}

export interface AuthSession {
  user: User
  company: Company
  token: string
}

export class AuthIdentity {
  readonly user: User

  constructor(user: User) {
    this.user = user
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.includes(this.user.role)
  }
}
