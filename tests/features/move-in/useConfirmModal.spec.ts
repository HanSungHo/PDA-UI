import { useConfirmModal } from 'src/features/move-in/composables/useConfirmModal';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

describe('useConfirmModal', () => {
  afterEach(() => {
    const modal = useConfirmModal();
    modal.resolveModal(false);
  });

  it('resolves an alert after the user confirms it', async () => {
    const modal = useConfirmModal();
    const result = modal.alert('검증 오류', '에  러');

    expect(modal.modalOpen.value).toBe(true);
    expect(modal.modalTitle.value).toBe('에  러');
    expect(modal.modalMessage.value).toBe('검증 오류');

    modal.resolveModal(true);
    await expect(result).resolves.toBe(true);
    expect(modal.modalOpen.value).toBe(false);
  });

  it('resolves a cancelled confirmation as false', async () => {
    const modal = useConfirmModal();
    const result = modal.confirm('진행하시겠습니까?', '확  인');

    modal.handleModalCancel();

    await expect(result).resolves.toBe(false);
    expect(modal.modalOpen.value).toBe(false);
  });

  it('shows queued alerts one at a time', async () => {
    const modal = useConfirmModal();
    const first = modal.alert('첫 번째', '에  러');
    const second = modal.alert('두 번째', '에  러');

    expect(modal.modalMessage.value).toBe('첫 번째');
    modal.resolveModal(true);
    await nextTick();

    expect(modal.modalOpen.value).toBe(true);
    expect(modal.modalMessage.value).toBe('두 번째');
    modal.resolveModal(true);

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
  });
});
