import type { PluginListenerHandle } from '@capacitor/core';
import {
  completeActiveEMaxAlarm,
  hasStackedEMaxAlarm,
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

  it('uses the real Capacitor platform check by default (browser: no bridge)', async () => {
    expect(await initializeEMaxUdpBridge(router)).toBeUndefined();
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

  it('shows the newest alarm first and OK reveals the previous one (Android Activity stack)', async () => {
    plugin.getPendingAlarms.mockResolvedValueOnce({
      events: [
        { id: 'queued-a', receiverMessage: '<INTERLOCKMANAGER>A</INTERLOCKMANAGER>' },
        { id: 'queued-b', receiverMessage: '<INTERLOCKMANAGER>B</INTERLOCKMANAGER>' },
      ],
    });
    plugin.acknowledgeAlarm.mockClear();

    await initializeEMaxUdpBridge(router, { isNativePlatform: () => true, plugin });
    await vi.waitFor(() =>
      expect(router.currentRoute.value.query.receiverMessage).toBe(
        '<INTERLOCKMANAGER>B</INTERLOCKMANAGER>',
      ),
    );
    expect(hasStackedEMaxAlarm()).toBe(true);
    expect(plugin.acknowledgeAlarm).not.toHaveBeenCalled();

    await completeActiveEMaxAlarm();
    expect(router.currentRoute.value.query.receiverMessage).toBe(
      '<INTERLOCKMANAGER>A</INTERLOCKMANAGER>',
    );
    expect(plugin.acknowledgeAlarm).toHaveBeenCalledWith({ id: 'queued-b' });
    expect(hasStackedEMaxAlarm()).toBe(false);

    await completeActiveEMaxAlarm();
    expect(plugin.acknowledgeAlarm).toHaveBeenCalledWith({ id: 'queued-a' });
  });

  it('a live alarm arriving while one is visible is shown on top immediately', async () => {
    await initializeEMaxUdpBridge(router, { isNativePlatform: () => true, plugin });
    listener?.({ id: 'old', receiverMessage: '<INTERLOCKMANAGER>old</INTERLOCKMANAGER>' });
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('emax'));
    listener?.({ id: 'new', receiverMessage: '<INTERLOCKMANAGER>new</INTERLOCKMANAGER>' });
    await vi.waitFor(() =>
      expect(router.currentRoute.value.query.receiverMessage).toBe(
        '<INTERLOCKMANAGER>new</INTERLOCKMANAGER>',
      ),
    );
    await completeActiveEMaxAlarm();
    expect(router.currentRoute.value.query.receiverMessage).toBe(
      '<INTERLOCKMANAGER>old</INTERLOCKMANAGER>',
    );
    await completeActiveEMaxAlarm();
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

  it('de-duplicates an alarm with the same id and completes one without an id', async () => {
    await initializeEMaxUdpBridge(router, { isNativePlatform: () => true, plugin });
    plugin.acknowledgeAlarm.mockClear();
    listener?.({ id: 'dup', receiverMessage: '<INTERLOCKMANAGER>1</INTERLOCKMANAGER>' });
    listener?.({ id: 'dup', receiverMessage: '<INTERLOCKMANAGER>2</INTERLOCKMANAGER>' });
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('emax'));
    await completeActiveEMaxAlarm();
    expect(plugin.acknowledgeAlarm).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.query.receiverMessage).toBe(
      '<INTERLOCKMANAGER>1</INTERLOCKMANAGER>',
    );

    listener?.({ receiverMessage: '<INTERLOCKMANAGER>noid</INTERLOCKMANAGER>' });
    await vi.waitFor(() =>
      expect(router.currentRoute.value.query.receiverMessage).toBe(
        '<INTERLOCKMANAGER>noid</INTERLOCKMANAGER>',
      ),
    );
    plugin.acknowledgeAlarm.mockClear();
    await completeActiveEMaxAlarm();
    expect(plugin.acknowledgeAlarm).not.toHaveBeenCalled();
  });
});
