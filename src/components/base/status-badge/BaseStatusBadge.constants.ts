import { CheckOutlined, CloseOutlined, DashOutlined, SyncOutlined } from '@ant-design/icons-vue';
import type { Component } from 'vue';

import type { BaseStatusBadgeColor, BaseStatusBadgeStatus } from './BaseStatusBadge.types';

interface BaseStatusBadgeStatusConfig {
  label: string;
  icon: Component;
}

export const BASE_STATUS_BADGE_STATUS_CONFIG = {
  completed: {
    label: 'COMPLETED',
    icon: CheckOutlined,
  },
  running: {
    label: 'RUNNING',
    icon: SyncOutlined,
  },
  pending: {
    label: 'PENDING',
    icon: SyncOutlined,
  },
  'in-progress': {
    label: 'IN PROGRESS',
    icon: DashOutlined,
  },
  'not-started': {
    label: 'NOT STARTED',
    icon: SyncOutlined,
  },
  failed: {
    label: 'FAILED',
    icon: CloseOutlined,
  },
} as const satisfies Record<BaseStatusBadgeStatus, BaseStatusBadgeStatusConfig>;

export const BASE_STATUS_BADGE_STATUS_COLORS = {
  completed: ['green'],
  running: ['blue', 'green'],
  pending: ['orange', 'yellow'],
  'in-progress': ['orange', 'yellow'],
  'not-started': ['gray'],
  failed: ['red'],
} as const satisfies Record<BaseStatusBadgeStatus, readonly BaseStatusBadgeColor[]>;

export const BASE_STATUS_BADGE_DEFAULT_COLOR_BY_STATUS = {
  completed: 'green',
  running: 'blue',
  pending: 'orange',
  'in-progress': 'orange',
  'not-started': 'gray',
  failed: 'red',
} as const satisfies Record<BaseStatusBadgeStatus, BaseStatusBadgeColor>;
