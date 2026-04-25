type RuntimeConfig = {
  API_URL?: string;
  SOCKET_URL?: string;
  SOCKET_PATH?: string;
  TYPEBOT_BUILDER_URL?: string;
  DEBUG_API?: string;
  DEBUG_SOCKET?: string;
};

declare global {
  interface Window {
    __WHATS_AUTO_CONFIG__?: RuntimeConfig;
  }
}

const runtimeConfig = window.__WHATS_AUTO_CONFIG__ || {};

const readValue = (runtimeValue: unknown, buildValue: unknown, fallback = ''): string => {
  if (typeof runtimeValue === 'string' && runtimeValue.trim()) {
    return runtimeValue.trim();
  }

  if (typeof buildValue === 'string' && buildValue.trim()) {
    return buildValue.trim();
  }

  return fallback;
};

const normalizeApiUrl = (value: string): string => {
  const normalized = value.trim().replace(/\/+$/, '');

  if (!normalized) {
    return '/api';
  }

  if (normalized.endsWith('/api')) {
    return normalized;
  }

  return `${normalized}/api`;
};

export const appConfig = {
  apiUrl: normalizeApiUrl(readValue(runtimeConfig.API_URL, import.meta.env.VITE_API_URL, '/api')),
  socketUrl: readValue(runtimeConfig.SOCKET_URL, import.meta.env.VITE_SOCKET_URL),
  socketPath: readValue(runtimeConfig.SOCKET_PATH, import.meta.env.VITE_SOCKET_PATH, '/socket.io'),
  typebotBuilderUrl: readValue(
    runtimeConfig.TYPEBOT_BUILDER_URL,
    import.meta.env.VITE_TYPEBOT_BUILDER_URL,
    'https://app.typebot.io/typebots'
  ),
  debugApi: readValue(runtimeConfig.DEBUG_API, import.meta.env.VITE_DEBUG_API) === 'true',
  debugSocket: readValue(runtimeConfig.DEBUG_SOCKET, import.meta.env.VITE_DEBUG_SOCKET) === 'true',
};
