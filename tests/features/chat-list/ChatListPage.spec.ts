import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { QIcon } from 'quasar';
import { BaseModal, BaseToast } from 'src/components/base';
import { BaseLoading } from 'src/components/base/loading';
import { DeviceInfo } from 'src/constants/device-info';
import { resetChatListState } from 'src/features/chat-list/composables/use-chat-list-state';
import ChatListPage from 'src/features/chat-list/pages/ChatListPage.vue';
import appRoutes from 'src/router/routes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchChatRooms } = vi.hoisted(() => ({ fetchChatRooms: vi.fn() }));
const { fetchPdaList, createPdaMessageRoom } = vi.hoisted(() => ({
  fetchPdaList: vi.fn().mockResolvedValue([]),
  createPdaMessageRoom: vi.fn(),
}));
const { routerPush, leaveGuards } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  leaveGuards: [] as ((to: { name: string }) => void)[],
}));
const appMock = vi.hoisted(() => ({ addListener: vi.fn(), remove: vi.fn() }));
const { localIpAddress } = vi.hoisted(() => ({ localIpAddress: vi.fn() }));

vi.mock('src/features/chat-list/services/chat-list.service', () => ({ fetchChatRooms }));
vi.mock('src/features/chat-list/services/chat-legacy.service', () => ({
  fetchPdaList,
  createPdaMessageRoom,
  ipText: (ip: string | null) => ip ?? 'null',
}));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
  onBeforeRouteLeave: (guard: (to: { name: string }) => void) => leaveGuards.push(guard),
}));
vi.mock('@capacitor/app', () => ({ App: { addListener: appMock.addListener } }));
vi.mock('src/utils/common-util', () => ({ CommonUtil: { localIpAddress } }));

enableAutoUnmount(afterEach);

describe('ChatListPage UI', () => {
  beforeEach(() => {
    resetChatListState();
    leaveGuards.length = 0;
    appMock.remove.mockReset();
    appMock.addListener.mockReset();
    appMock.addListener.mockResolvedValue({ remove: appMock.remove });
    fetchChatRooms.mockReset();
    fetchChatRooms.mockResolvedValue([]);
    fetchPdaList.mockReset();
    fetchPdaList.mockResolvedValue([]);
    createPdaMessageRoom.mockReset();
    createPdaMessageRoom.mockResolvedValue(undefined);
    localIpAddress.mockReset();
    localIpAddress.mockResolvedValue('10.0.0.12');
    routerPush.mockReset();
  });

  it('registers the main-menu chat route', async () => {
    const route = appRoutes.find((record) => record.path === '/chat');

    expect(route?.name).toBe('chat');
    expect(await (route?.component as () => Promise<{ default: unknown }>)()).toHaveProperty(
      'default',
      ChatListPage,
    );
  });

  it('renders legacy navigation labels', async () => {
    const wrapper = mount(ChatListPage);
    await flushPromises();

    expect(wrapper.text()).toContain('PDA');
    expect(wrapper.text()).toContain('메시지');
    expect(wrapper.get('.chat-list__nav-item--active').text()).toContain('메시지');
    expect(wrapper.find('.ds-screen__footer .chat-list__navigation').exists()).toBe(true);
    expect(wrapper.find('.chat-list__send').exists()).toBe(false);
    expect(wrapper.findAllComponents(QIcon).map((icon) => icon.props('name'))).toEqual([
      'sym_o_phone',
      'sym_o_chat_bubble',
    ]);

    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');

    expect(wrapper.get('.chat-list__nav-item--active').text()).toContain('PDA');
    expect(wrapper.findAll('.chat-list__room')).toHaveLength(0);
  });

  it('hides a zero unread badge and refreshes rooms when returning to the chat tab', async () => {
    fetchChatRooms.mockResolvedValue([
      {
        id: 'ROOM-1',
        name: 'Message',
        lastMessage: 'Description',
        time: 'hh/mm',
        unreadCount: '0',
      },
    ]);
    const wrapper = mount(ChatListPage);
    await flushPromises();

    expect(wrapper.findAll('.chat-list__room')).toHaveLength(1);
    expect(wrapper.find('.chat-list__unread').exists()).toBe(false);

    await wrapper.find('.chat-list__room').trigger('click');
    expect(routerPush).toHaveBeenCalledWith({
      name: 'chat-room',
      query: { roomId: 'ROOM-1', roomName: 'Message' },
    });

    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');
    await wrapper.findAll('.chat-list__nav-item')[1].trigger('click');
    await flushPromises();

    expect(fetchChatRooms).toHaveBeenCalledTimes(2);
  });

  it('renders a non-zero unread badge', async () => {
    fetchChatRooms.mockResolvedValue([
      {
        id: 'ROOM-1',
        name: 'Message',
        lastMessage: 'Description',
        time: 'hh/mm',
        unreadCount: '3',
      },
    ]);
    const wrapper = mount(ChatListPage);
    await flushPromises();

    expect(wrapper.get('.chat-list__unread').text()).toBe('3');
  });

  it('expands tree rows and cascades Area selection to Bay devices', async () => {
    fetchPdaList.mockResolvedValue([
      { id: 'PDA-1', ip: '10.0.0.1', area: 'AREA-1', bay: 'BAY-1', userName: 'user' },
      { id: 'PDA-2', ip: '10.0.0.2', area: 'AREA-1', bay: 'BAY-1', userName: 'user-2' },
    ]);
    const wrapper = mount(ChatListPage);
    await flushPromises();
    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');

    const areaRow = wrapper.get('.chat-list__tree-row--area');
    const areaToggle = areaRow.get('.chat-list__tree-toggle');
    expect(areaToggle.attributes('aria-label')).toContain(' 펼치기');

    await areaToggle.trigger('click');
    expect(areaToggle.attributes('aria-label')).toContain(' 접기');
    expect(wrapper.find('.chat-list__tree-row--bay').exists()).toBe(true);

    await wrapper.find('.chat-list__tree-row--bay .chat-list__tree-toggle').trigger('click');
    expect(wrapper.find('.chat-list__tree-device').exists()).toBe(true);

    await wrapper.find('.chat-list__tree-row--area .ds-checkbox__control').trigger('click');
    expect(wrapper.find('.chat-list__tree-device .q-checkbox__inner--truthy').exists()).toBe(true);
    expect(wrapper.get('.chat-list__selection').text()).toContain('선택: 2');

    await wrapper.find('.chat-list__tree-row--area .ds-checkbox__control').trigger('click');
    expect(wrapper.get('.chat-list__selection').text()).toContain('선택: 0');

    await wrapper.findAll('.chat-list__tree-device .ds-checkbox__control')[0].trigger('click');
    expect(wrapper.get('.chat-list__selection').text()).toContain('선택: 1');
  });

  async function openPdaTree(devices: unknown[]) {
    fetchPdaList.mockResolvedValue(devices);
    const wrapper = mount(ChatListPage);
    await flushPromises();
    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');
    return wrapper;
  }

  it('toggles Area and Bay expansion from the row but not from the checkbox', async () => {
    const wrapper = await openPdaTree([
      { id: 'PDA-1', ip: '10.0.0.1', area: 'AREA-1', bay: 'BAY-1', userName: 'user' },
    ]);
    const area = () => wrapper.get('.chat-list__tree-row--area');
    expect(wrapper.find('.chat-list__tree-row--bay').exists()).toBe(false);

    // Name is plain text owned by the screen, not a checkbox label.
    expect(area().find('.ds-checkbox__label').exists()).toBe(false);
    expect(area().get('.q-checkbox').attributes('aria-label')).toBe('AREA-1');
    await area().get('.chat-list__tree-name').trigger('click');
    expect(wrapper.find('.chat-list__tree-row--bay').exists()).toBe(true);
    expect(wrapper.get('.chat-list__selection').text()).toContain('선택: 0');

    await area().get('.ds-checkbox__control').trigger('click');
    expect(wrapper.find('.chat-list__tree-row--bay').exists()).toBe(true);

    await area().get('.chat-list__tree-toggle').trigger('click');
    expect(wrapper.find('.chat-list__tree-row--bay').exists()).toBe(false);
    await area().get('.chat-list__tree-toggle').trigger('click');

    const bay = () => wrapper.get('.chat-list__tree-row--bay');
    expect(wrapper.find('.chat-list__tree-device').exists()).toBe(false);
    await bay().get('.chat-list__tree-name').trigger('click');
    expect(wrapper.find('.chat-list__tree-device').exists()).toBe(true);
    await bay().get('.ds-checkbox__control').trigger('click');
    expect(wrapper.find('.chat-list__tree-device').exists()).toBe(true);
    await bay().trigger('click');
    expect(wrapper.find('.chat-list__tree-device').exists()).toBe(false);
  });

  it('ignores taps on a device name and keeps duplicate devices', async () => {
    const device = { id: 'PDA-1', ip: '10.0.0.1', area: 'AREA-1', bay: 'BAY-1', userName: 'user' };
    const wrapper = await openPdaTree([device, device]);
    await wrapper.get('.chat-list__tree-toggle').trigger('click');
    await wrapper.get('.chat-list__tree-row--bay .chat-list__tree-toggle').trigger('click');

    const rows = wrapper.findAll('.chat-list__tree-device');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toBe('PDA-1(user)');
    await rows[0].get('.chat-list__tree-name').trigger('click');
    await rows[0].trigger('click');
    expect(wrapper.get('.chat-list__selection').text()).toContain('선택: 0');
    expect(wrapper.findAll('.chat-list__tree-device')).toHaveLength(2);
    await rows[1].get('.ds-checkbox__control').trigger('click');
    expect(wrapper.get('.chat-list__selection').text()).toContain('선택: 1');
  });

  it('blocks tab switches while a room request is pending', async () => {
    let resolveRooms: (rooms: unknown[]) => void = () => undefined;
    fetchChatRooms.mockReturnValue(new Promise((resolve) => (resolveRooms = resolve)));
    const wrapper = mount(ChatListPage);
    await flushPromises();

    expect(wrapper.findComponent(BaseLoading).exists()).toBe(true);
    expect(wrapper.get('.chat-list__navigation').attributes('inert')).toBeDefined();
    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');
    expect(wrapper.get('.chat-list__nav-item--active').text()).toContain('메시지');

    resolveRooms([]);
    await flushPromises();
    expect(wrapper.findComponent(BaseLoading).exists()).toBe(false);
    expect(wrapper.get('.chat-list__navigation').attributes('inert')).toBeUndefined();
    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');
    expect(wrapper.get('.chat-list__nav-item--active').text()).toContain('PDA');
  });

  it('does not show the loading bar while createPdaMessageRoom runs', async () => {
    let resolvePdas: (devices: unknown[]) => void = () => undefined;
    fetchPdaList.mockReturnValue(new Promise((resolve) => (resolvePdas = resolve)));
    const wrapper = mount(ChatListPage);
    await flushPromises();
    expect(wrapper.findComponent(BaseLoading).exists()).toBe(true);
    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');
    resolvePdas([{ id: 'PDA-1', ip: '10.0.0.1', area: DeviceInfo.AREA, bay: 'B', userName: 'u' }]);
    await flushPromises();
    expect(wrapper.findComponent(BaseLoading).exists()).toBe(false);
    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');

    let resolveCreate: () => void = () => undefined;
    createPdaMessageRoom.mockReturnValue(new Promise<void>((resolve) => (resolveCreate = resolve)));
    await wrapper.get('.chat-list__tree-row--area .ds-checkbox__control').trigger('click');
    await wrapper.get('.chat-list__send .ds-btn').trigger('click');
    await flushPromises();
    expect(createPdaMessageRoom).toHaveBeenCalledTimes(1);
    expect(wrapper.findComponent(BaseLoading).exists()).toBe(false);
    resolveCreate();
    await flushPromises();
  });

  it('refreshes rooms when the app becomes active on the Message tab only', async () => {
    const wrapper = mount(ChatListPage);
    await flushPromises();
    const onState = appMock.addListener.mock.calls[0][1] as (state: { isActive: boolean }) => void;
    expect(appMock.addListener.mock.calls[0][0]).toBe('appStateChange');
    expect(fetchChatRooms).toHaveBeenCalledTimes(1);

    onState({ isActive: false });
    await flushPromises();
    expect(fetchChatRooms).toHaveBeenCalledTimes(1);
    onState({ isActive: true });
    await flushPromises();
    expect(fetchChatRooms).toHaveBeenCalledTimes(2);

    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');
    onState({ isActive: true });
    await flushPromises();
    expect(fetchChatRooms).toHaveBeenCalledTimes(2);

    wrapper.unmount();
    expect(appMock.remove).toHaveBeenCalledTimes(1);
  });

  it('removes the app listener when unmounted before it is registered', async () => {
    let resolveHandle: (handle: { remove: () => void }) => void = () => undefined;
    appMock.addListener.mockReturnValue(new Promise((resolve) => (resolveHandle = resolve)));
    const wrapper = mount(ChatListPage);
    wrapper.unmount();
    resolveHandle({ remove: appMock.remove });
    await flushPromises();
    expect(appMock.remove).toHaveBeenCalledTimes(1);
  });

  it('keeps tab, expansion and selection across the chat room and loads PDAs once', async () => {
    const devices = [{ id: 'PDA-1', ip: '10.0.0.1', area: 'A', bay: 'B', userName: 'u' }];
    const first = await openPdaTree(devices);
    await first.get('.chat-list__tree-toggle').trigger('click');
    await first.get('.chat-list__tree-row--area .ds-checkbox__control').trigger('click');
    leaveGuards[0]({ name: 'chat-room' });
    first.unmount();

    const second = mount(ChatListPage);
    await flushPromises();
    expect(fetchPdaList).toHaveBeenCalledTimes(1);
    expect(second.get('.chat-list__nav-item--active').text()).toContain('PDA');
    expect(second.get('.chat-list__selection').text()).toContain('선택: 1');
    second.unmount();

    // Leaving towards any other route drops the Activity state (new onCreate).
    leaveGuards[1]({ name: 'main' });
    const third = mount(ChatListPage);
    await flushPromises();
    expect(third.get('.chat-list__nav-item--active').text()).toContain('메시지');
    expect(fetchPdaList).toHaveBeenCalledTimes(2);
  });

  it('refreshes rooms on return from the chat room', async () => {
    const first = mount(ChatListPage);
    await flushPromises();
    leaveGuards[0]({ name: 'chat-room' });
    first.unmount();
    mount(ChatListPage);
    await flushPromises();
    expect(fetchChatRooms).toHaveBeenCalledTimes(2);
    expect(fetchPdaList).toHaveBeenCalledTimes(1);
  });

  it('creates a private room from one selected PDA', async () => {
    fetchPdaList.mockResolvedValue([
      { id: 'PDA-1', ip: '10.0.0.1', area: 'AREA-1', bay: 'BAY-1', userName: 'user' },
    ]);
    const wrapper = mount(ChatListPage);
    await flushPromises();

    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');
    await wrapper.find('.chat-list__tree-toggle').trigger('click');
    await wrapper.find('.chat-list__tree-row--bay .chat-list__tree-toggle').trigger('click');
    await wrapper.find('.chat-list__tree-device .ds-checkbox__control').trigger('click');
    await wrapper.get('.chat-list__send .ds-btn').trigger('click');
    await flushPromises();

    expect(createPdaMessageRoom).toHaveBeenCalledWith({
      roomType: 'PRIVATE',
      roomName: '10.0.0.1_10.0.0.12',
      ipAddrList: ['10.0.0.1', '10.0.0.12'],
    });
  });

  it('reads the local IP once and passes it to the room and PDA requests', async () => {
    mount(ChatListPage);
    await flushPromises();

    expect(localIpAddress).toHaveBeenCalledTimes(1);
    expect(fetchChatRooms).toHaveBeenCalledWith('10.0.0.12');
    expect(fetchPdaList).toHaveBeenCalledWith('10.0.0.12');
  });

  it('uses the literal "null" in the private room name and ipAddrList without a local IP', async () => {
    localIpAddress.mockResolvedValue(null);
    fetchPdaList.mockResolvedValue([
      { id: 'PDA-1', ip: '10.0.0.1', area: 'AREA-1', bay: 'BAY-1', userName: 'user' },
    ]);
    const wrapper = mount(ChatListPage);
    await flushPromises();

    expect(fetchChatRooms).toHaveBeenCalledWith(null);
    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');
    await wrapper.find('.chat-list__tree-toggle').trigger('click');
    await wrapper.find('.chat-list__tree-row--bay .chat-list__tree-toggle').trigger('click');
    await wrapper.find('.chat-list__tree-device .ds-checkbox__control').trigger('click');
    await wrapper.get('.chat-list__send .ds-btn').trigger('click');
    await flushPromises();

    expect(createPdaMessageRoom).toHaveBeenCalledWith({
      roomType: 'PRIVATE',
      roomName: '10.0.0.1_null',
      ipAddrList: ['10.0.0.1', 'null'],
    });
  });

  it('opens the group dialog and creates a named group room', async () => {
    fetchPdaList.mockResolvedValue([
      { id: 'PDA-1', ip: '10.0.0.1', area: 'AREA-1', bay: 'BAY-1', userName: 'user' },
      { id: 'PDA-2', ip: '10.0.0.2', area: 'AREA-1', bay: 'BAY-1', userName: 'user-2' },
    ]);
    const wrapper = mount(ChatListPage);
    await flushPromises();

    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');
    await wrapper.find('.chat-list__tree-toggle').trigger('click');
    await wrapper.find('.chat-list__tree-row--bay .chat-list__tree-toggle').trigger('click');
    await wrapper.find('.chat-list__tree-row--area .ds-checkbox__control').trigger('click');
    await wrapper.get('.chat-list__send .ds-btn').trigger('click');
    await flushPromises();

    wrapper.findComponent(BaseModal).vm.$emit('update:open', false);
    await wrapper.vm.$nextTick();
    await wrapper.get('.chat-list__send .ds-btn').trigger('click');
    await flushPromises();

    const groupInput = document.body.querySelector(
      '.ds-modal input[placeholder="그룹 이름 입력"]',
    ) as HTMLInputElement;
    expect(groupInput).not.toBeNull();
    document.body
      .querySelector('.ds-modal__footer button:first-child')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wrapper.vm.$nextTick();
    await wrapper.get('.chat-list__send .ds-btn').trigger('click');
    await flushPromises();
    const reopenedGroupInput = document.body.querySelector(
      '.ds-modal input[placeholder="그룹 이름 입력"]',
    ) as HTMLInputElement;
    reopenedGroupInput.value = 'Shift A';
    reopenedGroupInput.dispatchEvent(new Event('input', { bubbles: true }));
    const confirmButton = document.body.querySelector('.ds-modal__footer button:last-child');
    confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(createPdaMessageRoom).toHaveBeenCalledWith({
      roomType: 'GROUP',
      roomName: 'Shift A',
      ipAddrList: ['10.0.0.1', '10.0.0.12', '10.0.0.2'],
    });
  });

  it('does nothing when the already selected tab is selected again', async () => {
    const wrapper = mount(ChatListPage);
    await flushPromises();
    expect(fetchChatRooms).toHaveBeenCalledTimes(1);

    await wrapper.findAll('.chat-list__nav-item')[1].trigger('click');
    await flushPromises();
    expect(fetchChatRooms).toHaveBeenCalledTimes(1);

    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');
    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');
    await wrapper.findAll('.chat-list__nav-item')[1].trigger('click');
    await flushPromises();
    expect(fetchChatRooms).toHaveBeenCalledTimes(2);
  });

  it('shows the legacy toast and sends nothing when no PDA is selected', async () => {
    const wrapper = mount(ChatListPage);
    await flushPromises();
    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');
    await wrapper.get('.chat-list__send .ds-btn').trigger('click');

    expect(wrapper.findComponent(BaseToast).props('description')).toBe('선택된 PDA가 없습니다');
    expect(wrapper.findComponent(BaseToast).props('duration')).toBe(2000);
    expect(createPdaMessageRoom).not.toHaveBeenCalled();
    expect(wrapper.find('.ds-modal').exists()).toBe(false);
  });

  it('closes the group dialog without creating a room when the name is blank', async () => {
    fetchPdaList.mockResolvedValue([
      { id: 'PDA-1', ip: '10.0.0.1', area: 'AREA-1', bay: 'BAY-1', userName: 'user' },
      { id: 'PDA-2', ip: '10.0.0.2', area: 'AREA-1', bay: 'BAY-1', userName: 'user-2' },
    ]);
    const wrapper = mount(ChatListPage);
    await flushPromises();
    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');
    await wrapper.find('.chat-list__tree-row--area .ds-checkbox__control').trigger('click');
    await wrapper.get('.chat-list__send .ds-btn').trigger('click');
    await flushPromises();

    expect(wrapper.findComponent(BaseModal).props('open')).toBe(true);
    document.body
      .querySelector('.ds-modal__footer button:last-child')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(wrapper.findComponent(BaseModal).props('open')).toBe(false);
    expect(createPdaMessageRoom).not.toHaveBeenCalled();
  });

  it('shows an empty unread badge when the count is missing like the legacy adapter', async () => {
    fetchChatRooms.mockResolvedValue([
      { id: 'ROOM-1', name: 'Message', lastMessage: '', time: '', unreadCount: '' },
    ]);
    const wrapper = mount(ChatListPage);
    await flushPromises();

    expect(wrapper.find('.chat-list__unread').exists()).toBe(true);
  });

  it('scrolls the default Bay row into view once the PDA tab is shown after the list loads', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    let resolvePdas: (devices: unknown[]) => void = () => undefined;
    fetchPdaList.mockReturnValue(new Promise((resolve) => (resolvePdas = resolve)));
    const wrapper = mount(ChatListPage);
    await flushPromises();

    resolvePdas([
      { id: 'PDA-1', ip: '10.0.0.1', area: DeviceInfo.AREA, bay: DeviceInfo.BAY, userName: 'u' },
      { id: 'PDA-2', ip: '10.0.0.2', area: 'OTHER', bay: 'OTHER-BAY', userName: 'u2' },
    ]);
    await flushPromises();
    expect(scrollIntoView).not.toHaveBeenCalled();
    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');
    await flushPromises();

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  });

  it('clears chat and PDA data when refresh requests fail', async () => {
    fetchChatRooms.mockRejectedValue(new Error('chat unavailable'));
    fetchPdaList.mockRejectedValue(new Error('PDA unavailable'));
    const wrapper = mount(ChatListPage);
    await flushPromises();

    expect(wrapper.findAll('.chat-list__room')).toHaveLength(0);
    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');
    expect(wrapper.findAll('.chat-list__tree-card')).toHaveLength(0);
  });
});
