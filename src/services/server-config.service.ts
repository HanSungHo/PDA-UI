import {
  DEV_MOBILE_SERVER_IP,
  DEV_MOBILE_SERVER_NAME,
  DEV_SERVER,
  MOBILE_SERVER_PORT,
  PROD_MOBILE_SERVER_IP,
  PROD_MOBILE_SERVER_NAME,
  PROD_SERVER,
  type ServerType,
  UPDATE_SERVER_PORT,
} from 'src/constants/server';

export interface ServerConfig {
  selectedServer: boolean;
  serverName: string;
  serverType: ServerType;
  serverUrl: string;
}

export interface RuntimeServerInfo {
  mobileServerName: string;
  mobileServerUrl: string;
  updateServerUrl: string;
}

const SERVER_CONFIG_STORAGE_KEY = 'server.info';

const DEFAULT_SERVER_CONFIGS: ServerConfig[] = [
  {
    selectedServer: true,
    serverName: PROD_MOBILE_SERVER_NAME,
    serverType: PROD_SERVER,
    serverUrl: PROD_MOBILE_SERVER_IP,
  },
  {
    selectedServer: false,
    serverName: DEV_MOBILE_SERVER_NAME,
    serverType: DEV_SERVER,
    serverUrl: DEV_MOBILE_SERVER_IP,
  },
];

export function loadServerInfo(): RuntimeServerInfo {
  const configs = ensureServerConfigs();
  const selectedServer = configs.find((config) => config.selectedServer) ?? configs[0];
  const prodServer = configs.find((config) => config.serverType === PROD_SERVER) ?? configs[0];

  return {
    mobileServerName: selectedServer.serverName,
    mobileServerUrl: buildMobileServerUrl(selectedServer.serverUrl),
    updateServerUrl: buildUpdateServerUrl(prodServer.serverUrl),
  };
}

export function readServerConfigs(): ServerConfig[] {
  const storedValue = localStorage.getItem(SERVER_CONFIG_STORAGE_KEY);

  if (!storedValue) return [];

  return JSON.parse(storedValue) as ServerConfig[];
}

export function saveServerConfigs(configs: ServerConfig[]) {
  localStorage.setItem(SERVER_CONFIG_STORAGE_KEY, JSON.stringify(configs));
}

function ensureServerConfigs(): ServerConfig[] {
  const configs = readServerConfigs();

  if (configs.length === 2) return configs;

  const defaultConfigs = DEFAULT_SERVER_CONFIGS.map((config) => ({ ...config }));
  saveServerConfigs(defaultConfigs);

  return defaultConfigs;
}

function buildMobileServerUrl(host: string): string {
  return `http://${host}:${MOBILE_SERVER_PORT}`;
}

function buildUpdateServerUrl(host: string): string {
  return `http://${host}:${UPDATE_SERVER_PORT}`;
}
