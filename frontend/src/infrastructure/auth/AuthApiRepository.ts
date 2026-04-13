import type { AuthRepository } from '../../application/auth/AuthRepository'
import type { HttpClient } from '../../core/http/HttpClient'
import type { AuthSession, Company, User } from '../../domain/auth/AuthModels'

interface AuthSessionResponse {
  user: User
  company: Company
  token: string
}

interface MeResponse {
  user: User
  company: Company
}

export class AuthApiRepository implements AuthRepository {
  private readonly httpClient: HttpClient

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient
  }

  async login(email: string, password: string): Promise<AuthSession> {
    const response = await this.httpClient.post<AuthSessionResponse>('/auth/login', { email, password })

    return {
      user: response.data.user,
      company: response.data.company,
      token: response.data.token,
    }
  }

  async me(): Promise<{ user: User; company: Company }> {
    const response = await this.httpClient.get<MeResponse>('/auth/me')

    return {
      user: response.data.user,
      company: response.data.company,
    }
  }
}
