import { sampleResultMock } from '../mocks/mask-location-dialog.mock';
import type { SampleResult } from '../types/mask-location-dialog.types';

export async function checkPhotoSample(location: string): Promise<SampleResult> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    ...sampleResultMock,
    stop: location.toLocaleUpperCase().includes('STOP')
      ? `장비 [${location}] 공정이 중단되었습니다.`
      : '',
  };
}
