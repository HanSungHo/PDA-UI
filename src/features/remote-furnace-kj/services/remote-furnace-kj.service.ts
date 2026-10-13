import { createRemoteFurnaceKjMockApi } from '../mocks/remote-furnace-kj.mock';
import type { RemoteFurnaceKjApi } from '../types/remote-furnace-kj.types';

export const remoteFurnaceKjApi = createRemoteFurnaceKjMockApi();

let activeApi: RemoteFurnaceKjApi = remoteFurnaceKjApi;

export function getRemoteFurnaceKjApi(): RemoteFurnaceKjApi {
  return activeApi;
}

export function setRemoteFurnaceKjApi(api: RemoteFurnaceKjApi): void {
  activeApi = api;
}

export function resetRemoteFurnaceKjApi(): void {
  activeApi = remoteFurnaceKjApi;
}
