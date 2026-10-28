import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { BaseModal } from 'src/components/base';
import ChatRoomPage from 'src/features/chat-room/pages/ChatRoomPage.vue';
import { fetchChatRoom, sendChatMessage } from 'src/features/chat-room/services/chat-room.service';
import { CommonUtil } from 'src/utils/common-util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { addListener, removeListener } = vi.hoisted(() => ({
  addListener: vi.fn(),
  removeListener: vi.fn(),
}));
const { clearRoomMessages } = vi.hoisted(() => ({ clearRoomMessages: vi.fn() }));

vi.mock('src/features/chat-room/services/chat-room.service', () => ({
  fetchChatRoom: vi.fn(),
  sendChatMessage: vi.fn(),
}));
vi.mock('src/utils/common-util', () => ({ CommonUtil: { wifiIpAddress: vi.fn() } }));
vi.mock('src/services/hifos-udp-alarm.plugin', () => ({ HifosUdpAlarm: { addListener } }));
vi.mock('src/features/chat-room/services/chat-room-native.service', () => ({ clearRoomMessages }));

enableAutoUnmount(afterEach);

describe('ChatRoomPage', () => {
  beforeEach(() => {
    vi.mocked(CommonUtil.wifiIpAddress).mockResolvedValue('10.0.0.12');
    vi.mocked(fetchChatRoom).mockResolvedValue({
      messages: [
        {
          roomId: 'ROOM-1',
          senderId: 'Peer',
          senderIp: '10.0.0.24',
          text: 'Hello',
          time: '12:30',
          level: 'HIGH',
        },
      ],
      participants: ['Peer'],
      recipientIp: '10.0.0.24',
      recipientId: 'Peer',
    });
    vi.mocked(sendChatMessage).mockResolvedValue();
    addListener.mockReset();
    removeListener.mockReset();
    removeListener.mockResolvedValue(undefined);
    addListener.mockResolvedValue({ remove: removeListener });
    clearRoomMessages.mockReset();
    clearRoomMessages.mockResolvedValue(undefined);
  });

  it('uses the chat-list room query contract and renders the legacy data', async () => {
    const wrapper = mount(ChatRoomPage, { props: { roomId: 'ROOM-1', roomName: 'Review' } });
    await flushPromises();

    expect(fetchChatRoom).toHaveBeenCalledWith('ROOM-1', 'Review');
    expect(wrapper.get('h1').text()).toBe('Review');
    expect(wrapper.get('.chat-room__message-bubble').text()).toBe('Hello');
    expect(wrapper.find('.chat-room__message--high').exists()).toBe(true);
    expect(wrapper.get('.chat-room__participants-button').attributes('aria-label')).toBe('메뉴');
    expect(wrapper.get('input').attributes('placeholder')).toBe('메시지 입력');
    expect(wrapper.get('.chat-room__send').text()).toBe('전송');
    await wrapper.find('.chat-room__message-bubble').trigger('contextmenu');
    await wrapper.get('.chat-room__participants-button').trigger('click');
    const participantsModal = wrapper.findComponent(BaseModal);
    participantsModal.vm.$emit('update:open', false);
    participantsModal.vm.$emit('cancel');
  });

  it('filters the legacy disallowed characters and appends only a successful send', async () => {
    const wrapper = mount(ChatRoomPage, { props: { roomId: 'ROOM-1', roomName: 'Review' } });
    await flushPromises();

    await wrapper.find('input').setValue('Hi ');
    await wrapper.find('input').setValue(`Hi <&>'"`);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: 'ROOM-1',
        sMsg: 'Hi ',
        recieveIpAddress: '10.0.0.24',
      }),
    );
    expect(wrapper.findAll('.chat-room__message')).toHaveLength(2);
  });

  it('handles failed room loading, failed sending, and optional clipboard access', async () => {
    vi.mocked(fetchChatRoom).mockRejectedValue(new Error('room unavailable'));
    vi.mocked(sendChatMessage).mockRejectedValue(new Error('send unavailable'));
    const wrapper = mount(ChatRoomPage, { props: { roomId: 'ROOM-1', roomName: 'Review' } });
    await flushPromises();

    expect(wrapper.findAll('.chat-room__message')).toHaveLength(0);
    await wrapper.find('input').setValue('Hello');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.findAll('.chat-room__message')).toHaveLength(0);
  });

  it('clears messages and appends only matching native chat events', async () => {
    const wrapper = mount(ChatRoomPage, {
      props: { roomId: 'ROOM-1', roomName: 'Review', clearMessages: true },
    });
    await flushPromises();

    expect(clearRoomMessages).toHaveBeenCalledWith('Review');
    const callback = addListener.mock.calls[0]?.[1] as (message: Record<string, string>) => void;
    callback({
      roomId: 'OTHER',
      roomName: 'Other',
      senderId: 'Peer',
      senderIp: '10.0.0.24',
      text: 'Ignored',
      time: '12:31',
      level: 'NORMAL',
    });
    callback({
      roomId: 'ROOM-1',
      roomName: 'Review',
      senderId: 'Peer',
      senderIp: '10.0.0.24',
      text: 'Received',
      time: '12:32',
      level: 'NORMAL',
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('.chat-room__message-bubble').map((bubble) => bubble.text())).toEqual([
      'Hello',
      'Received',
    ]);
    wrapper.unmount();
    await flushPromises();
    expect(removeListener).toHaveBeenCalled();
  });

  it('handles native listener and clear-message failures', async () => {
    addListener.mockRejectedValue(new Error('listener unavailable'));
    clearRoomMessages.mockRejectedValue(new Error('native clear unavailable'));

    const wrapper = mount(ChatRoomPage, {
      props: { roomId: 'ROOM-1', roomName: 'Review', clearMessages: true },
    });
    await flushPromises();

    expect(clearRoomMessages).toHaveBeenCalledWith('Review');
    expect(addListener).toHaveBeenCalledWith('chatMessage', expect.any(Function));
    wrapper.unmount();
  });

  it('ignores room loading when no room id is provided', async () => {
    const wrapper = mount(ChatRoomPage);
    await flushPromises();

    expect(fetchChatRoom).not.toHaveBeenCalled();
    expect(wrapper.find('form').exists()).toBe(false);
  });
});
