import type { PluginListenerHandle } from '@capacitor/core';
import {
  completeActiveEMaxAlarm,
  initializeEMaxUdpBridge,
} from 'src/features/emax/services/emax-udp.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import type { EMaxUdpPayload } from '../../../src/features/emax/types/emax.types';

describe('initializeEMaxUdpBridge', () => {
  const remove = vi.fn<() => Promise<void>>();
  let listener: ((payload: EMaxUdpPayload) => void) | undefined;
  let calls: string[];

  const plugin = {
    addListener: vi.fn(async (_eventName: 'emax', callback: (payload: EMaxUdpPayload) => void) => {
      calls.push('addListener');
      listener = callback;
      return { remove } satisfies PluginListenerHandle;
    }),
    startListening: vi.fn(async () => {
      calls.push('startListening');
    }),
    getPendingAlarms: vi.fn(async () => ({ events: [] as EMaxUdpPayload[] })),
    acknowledgeAlarm: vi.fn(async () => undefined),
  };

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/main', name: 'main', component: { template: '<div>Main</div>' } },
      { path: '/emax', name: 'emax', component: { template: '<div>EMax</div>' } },
    ],
  });

  beforeEach(async () => {
    calls = [];
    listener = undefined;
    remove.mockReset();
    plugin.addListener.mockClear();
    plugin.startListening.mockClear();
    await router.push('/main');
    await router.isReady();
  });

  it('does nothing in a browser runtime', async () => {
    const result = await initializeEMaxUdpBridge(router, {
      isNativePlatform: () => false,
      plugin,
    });

    expect(result).toBeUndefined();
    expect(plugin.addListener).not.toHaveBeenCalled();
    expect(plugin.startListening).not.toHaveBeenCalled();
    expect(plugin.getPendingAlarms).not.toHaveBeenCalled();
  });

  it('subscribes before opening the native UDP socket', async () => {
    const result = await initializeEMaxUdpBridge(router, {
      isNativePlatform: () => true,
      plugin,
    });

    expect(result).toBeDefined();
    expect(plugin.addListener).toHaveBeenCalledWith('emax', expect.any(Function));
    expect(calls).toEqual(['addListener', 'startListening']);
    expect(plugin.getPendingAlarms).toHaveBeenCalledWith({ eventName: 'emax' });
  });

  it('opens EMax with the exact raw receiver message', async () => {
    await initializeEMaxUdpBridge(router, {
      isNativePlatform: () => true,
      plugin,
    });

    listener?.({ receiverMessage: '<INTERLOCKMANAGER>raw message</INTERLOCKMANAGER>' });
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('emax'));
    expect(router.currentRoute.value.query.receiverMessage).toBe(
      '<INTERLOCKMANAGER>raw message</INTERLOCKMANAGER>',
    );
    await completeActiveEMaxAlarm();
  });

  it('ignores an empty native payload', async () => {
    await initializeEMaxUdpBridge(router, {
      isNativePlatform: () => true,
      plugin,
    });

    listener?.({ receiverMessage: '' });
    expect(router.currentRoute.value.name).toBe('main');
  });

  it('opens an EMax alarm that arrived while the WebView was unavailable', async () => {
    plugin.getPendingAlarms.mockResolvedValueOnce({
      events: [
        { id: 'queued-emax', receiverMessage: '<INTERLOCKMANAGER>queued</INTERLOCKMANAGER>' },
      ],
    });

    await initializeEMaxUdpBridge(router, { isNativePlatform: () => true, plugin });

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('emax'));
    expect(plugin.acknowledgeAlarm).not.toHaveBeenCalled();
    await completeActiveEMaxAlarm();
    expect(plugin.acknowledgeAlarm).toHaveBeenCalledWith({ id: 'queued-emax' });
  });

  it('keeps pending alarms in order and acknowledges each only after it is handled', async () => {
    plugin.getPendingAlarms.mockResolvedValueOnce({
      events: [
        { id: 'queued-a', receiverMessage: '<INTERLOCKMANAGER>A</INTERLOCKMANAGER>' },
        { id: 'queued-b', receiverMessage: '<INTERLOCKMANAGER>B</INTERLOCKMANAGER>' },
      ],
    });

    await initializeEMaxUdpBridge(router, { isNativePlatform: () => true, plugin });
    await vi.waitFor(() =>
      expect(router.currentRoute.value.query.receiverMessage).toBe(
        '<INTERLOCKMANAGER>A</INTERLOCKMANAGER>',
      ),
    );
    expect(plugin.acknowledgeAlarm).not.toHaveBeenCalled();

    await completeActiveEMaxAlarm();
    await vi.waitFor(() =>
      expect(router.currentRoute.value.query.receiverMessage).toBe(
        '<INTERLOCKMANAGER>B</INTERLOCKMANAGER>',
      ),
    );
    expect(plugin.acknowledgeAlarm).toHaveBeenCalledWith({ id: 'queued-a' });

    await completeActiveEMaxAlarm();
    expect(plugin.acknowledgeAlarm).toHaveBeenCalledWith({ id: 'queued-b' });
  });

  it('removes the listener when starting the native socket fails', async () => {
    plugin.startListening.mockRejectedValueOnce(new Error('socket unavailable'));

    const result = await initializeEMaxUdpBridge(router, {
      isNativePlatform: () => true,
      plugin,
    });

    expect(result).toBeUndefined();
    expect(remove).toHaveBeenCalledOnce();
  });
});
