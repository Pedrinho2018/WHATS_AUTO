import { AuthService } from '../../application/auth/AuthService'
import { AuthApiRepository } from '../../infrastructure/auth/AuthApiRepository'
import { AxiosHttpClient } from '../../infrastructure/http/AxiosHttpClient'
import { BrowserTokenStorage } from '../../infrastructure/storage/BrowserTokenStorage'
import api from '../../services/api'

const tokenStorage = new BrowserTokenStorage('token')
const httpClient = new AxiosHttpClient(api)
const authRepository = new AuthApiRepository(httpClient)
const authService = new AuthService(authRepository, tokenStorage)

export const appContainer = {
  authService,
}
