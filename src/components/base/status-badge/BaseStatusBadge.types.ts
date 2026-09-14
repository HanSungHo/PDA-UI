import type { BASE_STATUS_BADGE_STATUS_COLORS } from './BaseStatusBadge.constants';

export type BaseStatusBadgeStatus =
  | 'completed'
  | 'running'
  | 'pending'
  | 'in-progress'
  | 'not-started'
  | 'failed';

export type BaseStatusBadgeColor =
  | 'green'
  | 'blue'
  | 'orange'
  | 'red'
  | 'gray'
  | 'purple'
  | 'cyan'
  | 'yellow';

export type BaseStatusBadgeColorForStatus<Status extends BaseStatusBadgeStatus> =
  (typeof BASE_STATUS_BADGE_STATUS_COLORS)[Status][number];

type BaseStatusBadgePropsWithStatus = {
  [Status in BaseStatusBadgeStatus]: {
    status: Status;
    color?: BaseStatusBadgeColorForStatus<Status> | undefined;
  };
}[BaseStatusBadgeStatus];

type BaseStatusBadgeDefaultStatusProps = {
  status?: undefined;
  color?: BaseStatusBadgeColorForStatus<'pending'> | undefined;
};

export type BaseStatusBadgeProps =
  | BaseStatusBadgePropsWithStatus
  | BaseStatusBadgeDefaultStatusProps;
