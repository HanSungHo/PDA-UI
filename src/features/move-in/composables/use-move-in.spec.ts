import { describe, expect, it } from 'vitest';

import { useMoveIn } from './use-move-in';

describe('useMoveIn', () => {
  it('exposes move-in state and handlers', () => {
    const vm = useMoveIn();

    expect(vm.lotId.value).toBe('');
    expect(vm.eqpId.value).toBe('');
    expect(typeof vm.onOK).toBe('function');
    expect(typeof vm.onCancel).toBe('function');
  });
});
