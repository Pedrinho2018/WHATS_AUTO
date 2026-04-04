import type { OperationResult } from '../../core/result/OperationResult'
import { operationFailure, operationSuccess } from '../../core/result/OperationResult'
import type { AuthSession, Company, User } from '../../domain/auth/AuthModels'
import type { AuthRepository, RegisterPayload } from './AuthRepository'

export interface TokenStorage {
  getToken(): string | null
  saveToken(token: string): void
  clearToken(): void
}

export class AuthService {
  private readonly repository: AuthRepository
  private readonly tokenStorage: TokenStorage

  constructor(
    repository: AuthRepository,
    tokenStorage: TokenStorage,
  ) {
    this.repository = repository
    this.tokenStorage = tokenStorage
  }

  getStoredToken(): string | null {
    return this.tokenStorage.getToken()
  }

  async login(email: string, password: string): Promise<OperationResult<AuthSession>> {
    try {
      const session = await this.repository.login(email, password)
      this.tokenStorage.saveToken(session.token)

      return operationSuccess(session)
    } catch (error: unknown) {
      return operationFailure(this.extractError(error, 'Erro ao fazer login'))
    }
  }

  async register(payload: RegisterPayload): Promise<OperationResult<AuthSession>> {
    try {
      const session = await this.repository.register(payload)
      this.tokenStorage.saveToken(session.token)

      return operationSuccess(session)
    } catch (error: unknown) {
      return operationFailure(this.extractError(error, 'Erro ao criar conta'))
    }
  }

  async fetchProfile(): Promise<OperationResult<{ user: User; company: Company }>> {
    try {
      const profile = await this.repository.me()
      return operationSuccess(profile)
    } catch (error: unknown) {
      return operationFailure(this.extractError(error, 'Sessao invalida'))
    }
  }

  logout(): void {
    this.tokenStorage.clearToken()
  }

  private extractError(error: unknown, fallback: string): string {
    const maybeError = error as { response?: { data?: { error?: string } } }
    return maybeError.response?.data?.error || fallback
  }
}
