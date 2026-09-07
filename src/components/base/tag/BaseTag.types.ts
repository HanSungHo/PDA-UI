import type { Component } from 'vue';

export type BaseTagColor = 'pink' | 'red' | 'green' | 'orange' | 'cyan' | 'purple' | 'blue';

export interface BaseTagProps {
  text?: string | undefined;
  icon?: Component | undefined;
  color?: BaseTagColor | undefined;
  bordered?: boolean | undefined;
}
