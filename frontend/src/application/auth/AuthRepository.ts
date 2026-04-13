import type { AuthSession, Company, User } from '../../domain/auth/AuthModels'

export interface AuthRepository {
  login(email: string, password: string): Promise<AuthSession>
  me(): Promise<{ user: User; company: Company }>
}
