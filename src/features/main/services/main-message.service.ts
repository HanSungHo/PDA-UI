import type { MessageResponseData } from 'src/types/api';

import type { MainApi } from './main-message.types';

export const mainApi: MainApi = {
  async sendMessage(request) {
    const { default: apiClient } = await import('src/services/api-client');
    const response = await apiClient.post<MessageResponseData>(
      `/hifos/${request.messageName}`,
      request.payload,
    );

    return response.data;
  },
};
