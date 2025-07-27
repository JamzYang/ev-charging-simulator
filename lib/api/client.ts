import { ApiResponse, ApiError, HttpStatusCode } from "@/types/api"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1'
const DEFAULT_TIMEOUT = 10000 // 10秒超时
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY = 1000 // 1秒重试延迟

interface RequestConfig extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
}

class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }

  // 请求拦截器
  private async requestInterceptor(config: RequestConfig): Promise<RequestConfig> {
    // 添加认证头等
    const headers = {
      ...this.defaultHeaders,
      ...config.headers,
    }

    // 添加时间戳防止缓存
    if (config.method === 'GET') {
      const url = new URL(config.url || '', this.baseUrl)
      url.searchParams.set('_t', Date.now().toString())
      config.url = url.toString()
    }

    return {
      ...config,
      headers,
      timeout: config.timeout || DEFAULT_TIMEOUT,
    }
  }

  // 响应拦截器
  private async responseInterceptor<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type')
    
    let data: any
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    if (!response.ok) {
      const error: ApiError = {
        code: response.status.toString(),
        message: data.message || response.statusText,
        details: data,
        timestamp: new Date().toISOString(),
      }
      throw error
    }

    // 如果响应已经是ApiResponse格式，直接返回
    if (data && typeof data === 'object' && 'success' in data) {
      return data as ApiResponse<T>
    }

    // 否则包装成ApiResponse格式
    return {
      success: true,
      message: 'Success',
      data: data as T,
      timestamp: new Date().toISOString(),
    }
  }

  // 错误处理
  private handleError(error: any): never {
    console.error('API请求错误:', error)
    
    if (error.name === 'AbortError') {
      throw new Error('请求超时')
    }
    
    if (error.code) {
      // 已经是ApiError格式
      throw error
    }
    
    // 网络错误或其他错误
    const apiError: ApiError = {
      code: 'NETWORK_ERROR',
      message: error.message || '网络连接失败',
      timestamp: new Date().toISOString(),
    }
    throw apiError
  }

  // 重试机制
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries: number = MAX_RETRY_ATTEMPTS,
    delay: number = RETRY_DELAY
  ): Promise<T> {
    try {
      return await requestFn()
    } catch (error: any) {
      if (retries > 0 && this.shouldRetry(error)) {
        console.log(`请求失败，${delay}ms后重试，剩余重试次数: ${retries}`)
        await this.sleep(delay)
        return this.retryRequest(requestFn, retries - 1, delay * 2) // 指数退避
      }
      throw error
    }
  }

  // 判断是否应该重试
  private shouldRetry(error: any): boolean {
    // 网络错误或服务器错误才重试
    if (error.name === 'AbortError') return false
    if (error.code === 'NETWORK_ERROR') return true
    
    const status = parseInt(error.code)
    return status >= HttpStatusCode.INTERNAL_SERVER_ERROR || 
           status === HttpStatusCode.BAD_GATEWAY ||
           status === HttpStatusCode.SERVICE_UNAVAILABLE
  }

  // 延迟函数
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 核心请求方法
  async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`
    
    return this.retryRequest(async () => {
      const requestConfig = await this.requestInterceptor({
        ...config,
        url,
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), requestConfig.timeout)

      try {
        const response = await fetch(url, {
          ...requestConfig,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        return await this.responseInterceptor<T>(response)
      } catch (error) {
        clearTimeout(timeoutId)
        return this.handleError(error)
      }
    }, config.retries, config.retryDelay)
  }

  // GET请求
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
      url += `?${searchParams.toString()}`
    }
    
    return this.request<T>(url, { method: 'GET' })
  }

  // POST请求
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // PUT请求
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // DELETE请求
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // PATCH请求
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // 设置默认头部
  setDefaultHeader(key: string, value: string) {
    this.defaultHeaders[key] = value
  }

  // 移除默认头部
  removeDefaultHeader(key: string) {
    delete this.defaultHeaders[key]
  }
}

// 单例实例
export const apiClient = new ApiClient()

// 导出类型
export type { RequestConfig }
export { ApiClient }
