import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { QIcon } from 'quasar';
import { BaseCheckbox, BaseModal } from 'src/components/base';
import ChatListPage from 'src/features/chat-list/pages/ChatListPage.vue';
import appRoutes from 'src/router/routes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchChatRooms } = vi.hoisted(() => ({ fetchChatRooms: vi.fn() }));
const { fetchPdaList, createPdaMessageRoom } = vi.hoisted(() => ({
  fetchPdaList: vi.fn().mockResolvedValue([]),
  createPdaMessageRoom: vi.fn(),
}));
const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));
const { wifiIpAddress } = vi.hoisted(() => ({ wifiIpAddress: vi.fn() }));

vi.mock('src/features/chat-list/services/chat-list.service', () => ({ fetchChatRooms }));
vi.mock('src/features/chat-list/services/chat-legacy.service', () => ({
  fetchPdaList,
  createPdaMessageRoom,
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock('src/utils/common-util', () => ({ CommonUtil: { wifiIpAddress } }));

enableAutoUnmount(afterEach);

describe('ChatListPage UI', () => {
  beforeEach(() => {
    fetchChatRooms.mockReset();
    fetchChatRooms.mockResolvedValue([]);
    fetchPdaList.mockReset();
    fetchPdaList.mockResolvedValue([]);
    createPdaMessageRoom.mockReset();
    createPdaMessageRoom.mockResolvedValue(undefined);
    wifiIpAddress.mockReset();
    wifiIpAddress.mockResolvedValue('10.0.0.12');
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

    wrapper
      .findAllComponents(BaseCheckbox)
      .find((checkbox) => checkbox.props('label') === 'AREA-1')
      ?.vm.$emit('update:modelValue', false);
    await wrapper.vm.$nextTick();
    expect(wrapper.get('.chat-list__selection').text()).toContain('선택: 0');

    await wrapper.findAll('.chat-list__tree-device .ds-checkbox__control')[0].trigger('click');
    expect(wrapper.get('.chat-list__selection').text()).toContain('선택: 1');
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
    await wrapper.get('.chat-list__send-button').trigger('click');
    await flushPromises();

    expect(createPdaMessageRoom).toHaveBeenCalledWith({
      roomType: 'PRIVATE',
      roomName: '10.0.0.1_10.0.0.12',
      ipAddrList: ['10.0.0.1', '10.0.0.12'],
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
    await wrapper.get('.chat-list__send-button').trigger('click');
    await flushPromises();

    wrapper.findComponent(BaseModal).vm.$emit('update:open', false);
    await wrapper.vm.$nextTick();
    await wrapper.get('.chat-list__send-button').trigger('click');
    await flushPromises();

    const groupInput = document.body.querySelector(
      '.ds-modal input[placeholder="그룹 이름 입력"]',
    ) as HTMLInputElement;
    expect(groupInput).not.toBeNull();
    document.body
      .querySelector('.ds-modal__footer button:first-child')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wrapper.vm.$nextTick();
    await wrapper.get('.chat-list__send-button').trigger('click');
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
