/* eslint-disable no-console */
import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { normalizeApiError } from './api-error';

export interface ApiClientOptions {
  baseURL?: string;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const config: ApiClientOptions = {};

  if (options.baseURL !== undefined) {
    config.baseURL = options.baseURL;
  }

  const client = axios.create(config);

  client.defaults.headers.common.Accept = 'application/json';
  client.defaults.headers.common['Content-Type'] = 'application/json';

  return client;
}

function attachAuthToken(config: InternalAxiosRequestConfig) {
  const token = localStorage.getItem('auth_token');

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}

function handleApiError(error: unknown) {
  const apiError = normalizeApiError(error);
  const { status } = apiError;

  if (status === 401) {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  } else if (status === 403) {
    console.error('Forbidden action attempt.');
  } else if (status !== null && status >= 500) {
    console.error('Server error occurred. Please try again later.');
  } else {
    console.error('Network error or server unreachable.');
  }

  return Promise.reject(apiError);
}

function installApiClientInterceptors(client: AxiosInstance) {
  client.interceptors.request.use(
    (config) => attachAuthToken(config),
    (error) => Promise.reject(normalizeApiError(error)),
  );

  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: unknown) => handleApiError(error),
  );

  return client;
}

const apiClient = createApiClient();

installApiClientInterceptors(apiClient);

export function setApiBaseUrl(baseURL: string) {
  apiClient.defaults.baseURL = baseURL;
}

export default apiClient;
