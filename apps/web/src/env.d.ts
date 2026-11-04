/// <reference types="@rsbuild/core/types" />

interface ImportMetaEnv {
  readonly PUBLIC_API_URL?: string;
  readonly PUBLIC_REGISTRATION_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
