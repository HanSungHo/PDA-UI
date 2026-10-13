import { getRemoteFurnaceKjPortStateClass } from 'src/features/remote-furnace-kj/port-state';
import { describe, expect, it } from 'vitest';

describe('getRemoteFurnaceKjPortStateClass', () => {
  it.each([
    ['INIT', 'remote-furnace-kj-port-state--init'],
    ['RUN', 'remote-furnace-kj-port-state--run'],
    ['PENDING', 'remote-furnace-kj-port-state--pending'],
    ['READY', 'remote-furnace-kj-port-state--ready'],
    ['RESERVED', 'remote-furnace-kj-port-state--reserved'],
    ['COMPLETE', 'remote-furnace-kj-port-state--complete'],
    ['IDLE', 'remote-furnace-kj-port-state--idle'],
  ])('maps %s to its Android port-state style', (status, expectedClass) => {
    expect(getRemoteFurnaceKjPortStateClass(status)).toBe(expectedClass);
  });

  it('returns no state style for an unknown status', () => {
    expect(getRemoteFurnaceKjPortStateClass('UNKNOWN')).toBe('');
  });
});
