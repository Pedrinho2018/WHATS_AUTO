import type { TokenStorage } from '../../application/auth/AuthService'

export class BrowserTokenStorage implements TokenStorage {
  private readonly key: string

  constructor(key: string) {
    this.key = key
  }

  getToken(): string | null {
    return localStorage.getItem(this.key)
  }

  saveToken(token: string): void {
    localStorage.setItem(this.key, token)
  }

  clearToken(): void {
    localStorage.removeItem(this.key)
  }
}
