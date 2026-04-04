import type { AxiosInstance } from 'axios'
import type { HttpClient, HttpResponse } from '../../core/http/HttpClient'

export class AxiosHttpClient implements HttpClient {
  private readonly instance: AxiosInstance

  constructor(instance: AxiosInstance) {
    this.instance = instance
  }

  async get<T>(url: string): Promise<HttpResponse<T>> {
    const response = await this.instance.get<T>(url)
    return {
      data: response.data,
      status: response.status,
    }
  }

  async post<T>(url: string, payload?: unknown): Promise<HttpResponse<T>> {
    const response = await this.instance.post<T>(url, payload)
    return {
      data: response.data,
      status: response.status,
    }
  }
}
