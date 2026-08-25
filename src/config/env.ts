export type RequiredEnvKey = 'VITE_API_BASE_URL';

type EnvSource = Partial<Record<RequiredEnvKey, string | undefined>>;

export function getRequiredEnv(key: RequiredEnvKey, env: EnvSource = import.meta.env): string {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}
