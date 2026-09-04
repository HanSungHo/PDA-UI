import type { RouteLocationRaw } from 'vue-router';

export interface BaseBreadcrumbItem {
  label: string;
  to?: RouteLocationRaw;
  disabled?: boolean | undefined;
}

export interface BaseBreadcrumbProps {
  items: BaseBreadcrumbItem[];
  showHomeIcon?: boolean | undefined;
  separator?: string | undefined;
  ariaLabel?: string | undefined;
}

export const baseBreadcrumbDefaults = {
  showHomeIcon: true,
  separator: '/',
  ariaLabel: 'Breadcrumb',
} as const;
