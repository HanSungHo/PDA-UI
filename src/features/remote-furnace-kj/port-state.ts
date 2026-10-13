const PORT_STATE_CLASS_BY_STATUS: Readonly<Record<string, string>> = {
  INIT: 'remote-furnace-kj-port-state--init',
  RUN: 'remote-furnace-kj-port-state--run',
  PENDING: 'remote-furnace-kj-port-state--pending',
  READY: 'remote-furnace-kj-port-state--ready',
  RESERVED: 'remote-furnace-kj-port-state--reserved',
  COMPLETE: 'remote-furnace-kj-port-state--complete',
  IDLE: 'remote-furnace-kj-port-state--idle',
};

export function getRemoteFurnaceKjPortStateClass(status: string): string {
  return PORT_STATE_CLASS_BY_STATUS[status.trim().toUpperCase()] ?? '';
}
