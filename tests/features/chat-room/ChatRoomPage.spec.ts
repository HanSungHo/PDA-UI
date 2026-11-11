import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { BaseModal, BaseToast } from 'src/components/base';
import { DeviceInfo } from 'src/constants/device-info';
import ChatRoomPage from 'src/features/chat-room/pages/ChatRoomPage.vue';
import { fetchChatRoom, sendChatMessage } from 'src/features/chat-room/services/chat-room.service';
import { CommonUtil } from 'src/utils/common-util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { clearRoomMessages } = vi.hoisted(() => ({ clearRoomMessages: vi.fn() }));

vi.mock('src/features/chat-room/services/chat-room.service', () => ({
  fetchChatRoom: vi.fn(),
  sendChatMessage: vi.fn(),
}));
vi.mock('src/utils/common-util', () => ({ CommonUtil: { localIpAddress: vi.fn() } }));
vi.mock('src/features/chat-room/services/chat-room-native.service', () => ({ clearRoomMessages }));

enableAutoUnmount(afterEach);

const SEND_BUTTON = '[role="group"] .ds-btn';

function findInBody(selector: string, text: string): HTMLElement | undefined {
  return Array.from(document.body.querySelectorAll<HTMLElement>(selector)).find((node) =>
    node.textContent?.includes(text),
  );
}

describe('ChatRoomPage', () => {
  beforeEach(() => {
    vi.mocked(CommonUtil.localIpAddress).mockResolvedValue('10.0.0.12');
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
    clearRoomMessages.mockReset();
    clearRoomMessages.mockResolvedValue(undefined);
  });

  it('uses the legacy room-message contract and renders the legacy data', async () => {
    const wrapper = mount(ChatRoomPage, { props: { roomId: 'ROOM-1', roomName: 'Review' } });
    await flushPromises();

    expect(fetchChatRoom).toHaveBeenCalledWith('ROOM-1', 'Review', '10.0.0.12');
    expect(wrapper.get('h1').text()).toBe('Review');
    expect(wrapper.get('.chat-room__message-bubble').text()).toBe('Hello');
    expect(wrapper.get('.chat-room__message-time').text()).toBe('12:30');
    expect(wrapper.find('.chat-room__message--high').exists()).toBe(true);
    expect(wrapper.find('.chat-room__message--outgoing').exists()).toBe(false);
    expect(wrapper.get('input').attributes('placeholder')).toBe('메시지 입력');
    expect(wrapper.get(SEND_BUTTON).text()).toBe('전송');
    expect(wrapper.findComponent(BaseToast).exists()).toBe(false);
  });

  it('hides the composer and the menu when no room id is provided', async () => {
    const wrapper = mount(ChatRoomPage, { props: { roomName: 'Review' } });
    await flushPromises();

    expect(fetchChatRoom).not.toHaveBeenCalled();
    expect(wrapper.find('[role="group"]').exists()).toBe(false);
    expect(wrapper.find('.chat-room__menu').exists()).toBe(false);
    expect(wrapper.get('h1').text()).toBe('Review');
  });

  it('does not render an empty footer bar', async () => {
    const wrapper = mount(ChatRoomPage, { props: { roomId: 'ROOM-1', roomName: 'Review' } });
    await flushPromises();

    expect(wrapper.find('.ds-screen__footer').exists()).toBe(false);
  });

  it('rejects edits containing legacy disallowed characters', async () => {
    const wrapper = mount(ChatRoomPage, { props: { roomId: 'ROOM-1', roomName: 'Review' } });
    await flushPromises();
    const field = wrapper.get('input');

    await field.setValue('Hi ');
    await field.setValue(`Hi <&>'"`);
    await flushPromises();

    expect((field.element as HTMLInputElement).value).toBe('Hi ');
  });

  it('sends the legacy request, clears the field at once and prepends only on success', async () => {
    let resolveSend: () => void = () => undefined;
    vi.mocked(sendChatMessage).mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSend = resolve;
      }),
    );
    const wrapper = mount(ChatRoomPage, { props: { roomId: 'ROOM-1', roomName: 'Review' } });
    await flushPromises();

    await wrapper.get('input').setValue('Hi ');
    await wrapper.get(SEND_BUTTON).trigger('click');

    expect(sendChatMessage).toHaveBeenCalledWith({
      sType: 'PRIVATE',
      sArea: '',
      sBay: '',
      recieveIpAddress: '10.0.0.24',
      sMsg: 'Hi ',
      senderIpAddress: '10.0.0.12',
      senderId: DeviceInfo.OPERATOR_NAME,
      roomId: 'ROOM-1',
      sLevel: 'NORMAL',
    });
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('');
    expect(wrapper.findAll('.chat-room__message')).toHaveLength(1);
    expect(wrapper.get(SEND_BUTTON).attributes('disabled')).toBeUndefined();

    resolveSend();
    await flushPromises();

    const rows = wrapper.findAll('.chat-room__message');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.classes()).toContain('chat-room__message--outgoing');
    expect(rows[0]?.get('.chat-room__message-bubble').text()).toBe('Hi');
  });

  it('never treats a message as outgoing without a local IP and sends the literal "null"', async () => {
    vi.mocked(CommonUtil.localIpAddress).mockResolvedValue(null);
    vi.mocked(fetchChatRoom).mockResolvedValue({
      messages: [
        { roomId: 'ROOM-1', senderId: 'A', senderIp: 'null', text: 'x', time: '', level: '' },
        { roomId: 'ROOM-1', senderId: 'B', senderIp: '', text: 'y', time: '', level: '' },
      ],
      participants: [],
      recipientIp: '10.0.0.24',
      recipientId: 'Peer',
    });
    const wrapper = mount(ChatRoomPage, { props: { roomId: 'ROOM-1', roomName: 'Review' } });
    await flushPromises();

    expect(fetchChatRoom).toHaveBeenCalledWith('ROOM-1', 'Review', null);
    expect(wrapper.find('.chat-room__message--outgoing').exists()).toBe(false);
    await wrapper.get('input').setValue('Hi');
    await wrapper.get(SEND_BUTTON).trigger('click');
    await flushPromises();

    expect(sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({ senderIpAddress: 'null', recieveIpAddress: '10.0.0.24' }),
    );
    expect(wrapper.find('.chat-room__message--outgoing').exists()).toBe(false);
  });

  it('does nothing when the field is empty', async () => {
    const wrapper = mount(ChatRoomPage, { props: { roomId: 'ROOM-1', roomName: 'Review' } });
    await flushPromises();

    await wrapper.get(SEND_BUTTON).trigger('click');

    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it('handles failed room loading and failed sending without changing the list', async () => {
    vi.mocked(fetchChatRoom).mockRejectedValue(new Error('room unavailable'));
    vi.mocked(sendChatMessage).mockRejectedValue(new Error('send unavailable'));
    const wrapper = mount(ChatRoomPage, { props: { roomId: 'ROOM-1', roomName: 'Review' } });
    await flushPromises();

    expect(wrapper.findAll('.chat-room__message')).toHaveLength(0);
    await wrapper.get('input').setValue('Hello');
    await wrapper.get(SEND_BUTTON).trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.chat-room__message')).toHaveLength(0);
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('');
  });

  it('opens the participants dialog from the menu item', async () => {
    const wrapper = mount(ChatRoomPage, {
      props: { roomId: 'ROOM-1', roomName: 'Review' },
      attachTo: document.body,
    });
    await flushPromises();

    await wrapper.get('.chat-room__menu-button').trigger('click');
    await flushPromises();
    const item = findInBody('.q-item', '참여자 보기');
    expect(item).toBeDefined();
    item?.click();
    await flushPromises();

    const modal = wrapper.findComponent(BaseModal);
    expect(modal.props('open')).toBe(true);
    expect(document.body.textContent).toContain('Peer');
    findInBody('.ds-btn', '닫기')?.click();
    await flushPromises();
    expect(modal.props('open')).toBe(false);
  });

  it('copies a message from the long-press menu and shows the legacy toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const wrapper = mount(ChatRoomPage, {
      props: { roomId: 'ROOM-1', roomName: 'Review' },
      attachTo: document.body,
    });
    await flushPromises();

    await wrapper.get('.chat-room__message-bubble').trigger('contextmenu');
    await flushPromises();
    const item = findInBody('.q-item', '복사');
    expect(item).toBeDefined();
    item?.click();
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith('Hello');
    const toast = wrapper.findComponent(BaseToast);
    expect(toast.props('description')).toBe('복사되었습니다');
    expect(toast.props('closable')).toBe(false);
    toast.vm.$emit('close');
    await flushPromises();
    expect(wrapper.findComponent(BaseToast).exists()).toBe(false);
  });

  it('shows the toast even when clipboard access fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    const wrapper = mount(ChatRoomPage, {
      props: { roomId: 'ROOM-1', roomName: 'Review' },
      attachTo: document.body,
    });
    await flushPromises();

    await wrapper.get('.chat-room__message-bubble').trigger('contextmenu');
    await flushPromises();
    findInBody('.q-item', '복사')?.click();
    await flushPromises();

    expect(wrapper.findComponent(BaseToast).exists()).toBe(true);
  });

  it('clears the room notification only when the clearMessages flag is set', async () => {
    mount(ChatRoomPage, { props: { roomId: 'ROOM-1', roomName: 'Review' } });
    await flushPromises();
    expect(clearRoomMessages).not.toHaveBeenCalled();

    mount(ChatRoomPage, {
      props: { roomId: 'ROOM-1', roomName: 'Review', clearMessages: true },
    });
    await flushPromises();
    expect(clearRoomMessages).toHaveBeenCalledWith('Review');
  });

  it('ignores a native clear-message failure', async () => {
    clearRoomMessages.mockRejectedValue(new Error('native clear unavailable'));

    mount(ChatRoomPage, {
      props: { roomId: 'ROOM-1', roomName: 'Review', clearMessages: true },
    });
    await flushPromises();

    expect(clearRoomMessages).toHaveBeenCalledWith('Review');
  });

  it('shows a blocking loader during the room fetch and cannot send before it ends', async () => {
    let resolveRoom: (value: Awaited<ReturnType<typeof fetchChatRoom>>) => void = () => undefined;
    vi.mocked(fetchChatRoom).mockReturnValue(
      new Promise((resolve) => {
        resolveRoom = resolve;
      }),
    );
    const wrapper = mount(ChatRoomPage, { props: { roomId: 'ROOM-1', roomName: 'Review' } });
    await flushPromises();

    expect(wrapper.find('.chat-room__loading').exists()).toBe(true);
    const field = wrapper.get('input');
    expect(field.attributes('disabled')).toBeUndefined();
    await field.setValue('early');
    await wrapper.get(SEND_BUTTON).trigger('click');
    expect(sendChatMessage).not.toHaveBeenCalled();

    resolveRoom({ messages: [], participants: [], recipientIp: '10.0.0.24', recipientId: 'Peer' });
    await flushPromises();
    expect(wrapper.find('.chat-room__loading').exists()).toBe(false);
    await wrapper.get(SEND_BUTTON).trigger('click');
    expect(sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({ recieveIpAddress: '10.0.0.24' }),
    );
  });

  it('reloads the room and applies clearMessages when the reused route changes props', async () => {
    let resolveFirst: (value: Awaited<ReturnType<typeof fetchChatRoom>>) => void = () => undefined;
    vi.mocked(fetchChatRoom).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    );
    const wrapper = mount(ChatRoomPage, { props: { roomId: 'ROOM-1', roomName: 'Review' } });
    await flushPromises();

    await wrapper.setProps({ roomId: 'ROOM-2', roomName: 'Other', clearMessages: true });
    await flushPromises();
    expect(fetchChatRoom).toHaveBeenLastCalledWith('ROOM-2', 'Other', '10.0.0.12');
    expect(clearRoomMessages).toHaveBeenCalledWith('Other');
    expect(wrapper.get('h1').text()).toBe('Other');
    expect(wrapper.findAll('.chat-room__message')).toHaveLength(1);

    // A stale response from the previous room must not overwrite the new one.
    resolveFirst({
      messages: [],
      participants: [],
      recipientIp: '',
      recipientId: '',
    });
    await flushPromises();
    expect(wrapper.findAll('.chat-room__message')).toHaveLength(1);
    expect(wrapper.find('.chat-room__loading').exists()).toBe(false);
  });

  it('lists duplicate and empty participant ids', async () => {
    vi.mocked(fetchChatRoom).mockResolvedValue({
      messages: [],
      participants: ['Peer', 'Peer', ''],
      recipientIp: '',
      recipientId: '',
    });
    const wrapper = mount(ChatRoomPage, {
      props: { roomId: 'ROOM-1', roomName: 'Review' },
      attachTo: document.body,
    });
    await flushPromises();
    await wrapper.get('.chat-room__menu-button').trigger('click');
    await flushPromises();
    findInBody('.q-item', '참여자 보기')?.click();
    await flushPromises();

    expect(document.body.querySelectorAll('.chat-room__participants li')).toHaveLength(3);
  });
});
