export const DEFAULT_SERVER = 'DEFAULT_SERVER';
export const SELECTED_SERVER = 'SELECTED_SERVER';

export const PROD_SERVER = 'PROD_SERVER';
export const DEV_SERVER = 'DEV_SERVER';

export const DEFAULT_MOBILE_SERVER_URL = 'http://127.0.0.1:8080';
export const DEFAULT_UPDATE_SERVER_URL = 'http://127.0.0.1:8081';

export const MOBILE_SERVER_NAME = 'L4-DEVICE';

export const PROD_MOBILE_SERVER_NAME = 'L4-DEVICE';
export const DEV_MOBILE_SERVER_NAME = 'DEV-SERVER';

export const PROD_MOBILE_SERVER_IP = '127.0.0.1';
export const DEV_MOBILE_SERVER_IP = '10.0.0.1';

export const MOBILE_SERVER_PORT = '8080';
export const UPDATE_SERVER_PORT = '8081';

export const RETROFIT_CONNECT_TIMEOUT = 10;
export const RETROFIT_READ_TIMEOUT = 10;
export const RETROFIT_WRITE_TIMEOUT = 10;

export type ServerType = typeof PROD_SERVER | typeof DEV_SERVER;
