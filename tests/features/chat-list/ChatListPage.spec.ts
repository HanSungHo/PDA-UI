import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { QIcon } from 'quasar';
import ChatListPage from 'src/features/chat-list/pages/ChatListPage.vue';
import appRoutes from 'src/router/routes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchChatRooms } = vi.hoisted(() => ({ fetchChatRooms: vi.fn() }));

vi.mock('src/features/chat-list/services/chat-list.service', () => ({ fetchChatRooms }));

enableAutoUnmount(afterEach);

describe('ChatListPage UI', () => {
  beforeEach(() => {
    fetchChatRooms.mockReset();
    fetchChatRooms.mockResolvedValue([]);
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

    await wrapper.findAll('.chat-list__nav-item')[0].trigger('click');
    await wrapper.findAll('.chat-list__nav-item')[1].trigger('click');
    await flushPromises();

    expect(fetchChatRooms).toHaveBeenCalledTimes(2);
  });
});
