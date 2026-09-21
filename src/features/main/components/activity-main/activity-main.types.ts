import type { RoutePath } from 'src/constants/routes';

import type { ACTIVITY_MAIN_ACTION_ID } from './activity-main.constants';

export type ActivityMainActionId =
  (typeof ACTIVITY_MAIN_ACTION_ID)[keyof typeof ACTIVITY_MAIN_ACTION_ID];

export type ActivityMainActionColumn = 'left' | 'right' | 'footer' | 'header';
export type ActivityMainVisibility = 'always' | 'hidden' | 'gasInput';

export interface ActivityMainAction {
  id: ActivityMainActionId;
  label: string;
  target: RoutePath;
  column: ActivityMainActionColumn;
  visibility: ActivityMainVisibility;
  large?: boolean;
  textSize?: 'normal' | 'small';
}

export interface ActivityMainVisibilityState {
  gasInput: string;
}

export interface ActivityMainProps extends ActivityMainVisibilityState {
  deviceName: string;
  isLoggedIn: boolean;
  mainTitle: string;
  operatorName: string;
}

export interface ActivityMainEmits {
  (event: 'select-action', action: ActivityMainAction): void;
}
