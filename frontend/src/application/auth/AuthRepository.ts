import type { AuthSession, Company, User } from '../../domain/auth/AuthModels'

export interface RegisterPayload {
  name: string
  email: string
  password: string
  companyName: string
  subdomain: string
  phone?: string
}

export interface AuthRepository {
  login(email: string, password: string): Promise<AuthSession>
  register(payload: RegisterPayload): Promise<AuthSession>
  me(): Promise<{ user: User; company: Company }>
}
