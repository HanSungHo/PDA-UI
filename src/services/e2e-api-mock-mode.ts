const E2E_API_MOCK_BYPASS_KEY = 'atop26.e2e-api-mock';

export function isE2EApiMockEnabled(): boolean {
  return (
    typeof window !== 'undefined' && window.localStorage.getItem(E2E_API_MOCK_BYPASS_KEY) === 'true'
  );
}
