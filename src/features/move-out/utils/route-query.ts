import type { LocationQuery, RouteParamsGeneric } from 'vue-router';

interface RouteStringSource {
  params?: RouteParamsGeneric;
  query?: LocationQuery;
}

export function queryString(
  route: RouteStringSource | null | undefined,
  key: string,
  fallback = '',
): string {
  const value = route?.query?.[key];
  return typeof value === 'string' ? value : fallback;
}

export function routeString(
  route: RouteStringSource | null | undefined,
  key: string,
  fallback = '',
): string {
  const queryValue = queryString(route, key);
  if (queryValue) return queryValue;

  const value = route?.params?.[key];
  return typeof value === 'string' ? value : fallback;
}
