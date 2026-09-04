/// <reference types="vite/client" />

import 'vue';

/**
 * Add types for your custom environment variables to avoid TypeScript errors.
 * Define environment variables that are prefixed with VITE_ to be exposed to client-side code.
 *
 * https://vitejs.dev/guide/env-and-mode.html#intellisense-for-typescript
 *
 * @example
 * interface ImportMetaEnv {
 *   readonly MY_VAR: string;
 *   readonly MY_OTHER_VAR: string;
 * }
 */
declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $t: (key: string) => string;
  }
}

export {};
