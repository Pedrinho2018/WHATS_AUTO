/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_DEBUG_API?: string;
  readonly VITE_SOCKET_URL?: string;
  readonly VITE_SOCKET_PATH?: string;
  readonly VITE_DEBUG_SOCKET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}