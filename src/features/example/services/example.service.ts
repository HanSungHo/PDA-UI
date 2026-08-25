import apiClient from 'src/services/api-client';

import type { ExampleSummary } from '../types/example.types';

export async function getExampleSummaries(): Promise<ExampleSummary[]> {
  const response = await apiClient.get<ExampleSummary[]>('/examples');

  return response.data;
}
