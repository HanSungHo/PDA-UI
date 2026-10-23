import { mount } from '@vue/test-utils';
import { useStepperIdle } from 'src/features/stepper-idle/composables/use-stepper-idle';
import { stepperIdleMockMessage } from 'src/features/stepper-idle/mocks/stepper-idle.mock';
import { describe, expect, it } from 'vitest';
import { defineComponent, ref } from 'vue';

// ── helper: wrap composable in a host component so we can test reactivity ──
function mountComposable(initialMessage: string) {
  const message = ref(initialMessage);
  let exposed: ReturnType<typeof useStepperIdle>;

  mount(
    defineComponent({
      setup() {
        exposed = useStepperIdle(() => message.value);
        return {};
      },
      template: '<div/>',
    }),
    { global: { stubs: { transition: true } } },
  );

  return {
    message,
    get composable() {
      return exposed;
    },
  };
}

describe('useStepperIdle', () => {
  it('exposes parsed sTime from mock message', () => {
    const { composable } = mountComposable(stepperIdleMockMessage);
    expect(composable.sTime.value).toBe('2026-10-21T09:15:30.000+09:00');
  });

  it('exposes parsed sEqpid from mock message', () => {
    const { composable } = mountComposable(stepperIdleMockMessage);
    expect(composable.sEqpid.value).toBe('STEPPER-EQP-01');
  });

  it('exposes parsed sLotid from mock message', () => {
    const { composable } = mountComposable(stepperIdleMockMessage);
    expect(composable.sLotid.value).toBe('LOT-DEMO-IDLE-01');
  });

  it('exposes parsed sWafer from mock message', () => {
    const { composable } = mountComposable(stepperIdleMockMessage);
    expect(composable.sWafer.value).toBe('12');
  });

  it('returns empty strings for non-INTERLOCKMANAGER message', () => {
    const { composable } = mountComposable('');
    expect(composable.sTime.value).toBe('');
    expect(composable.sEqpid.value).toBe('');
    expect(composable.sLotid.value).toBe('');
    expect(composable.sWafer.value).toBe('');
  });

  it('reacts to receiverMessage changes', async () => {
    const { message, composable } = mountComposable('');
    expect(composable.sEqpid.value).toBe('');

    message.value = stepperIdleMockMessage;
    await new Promise((r) => setTimeout(r, 0));

    expect(composable.sEqpid.value).toBe('STEPPER-EQP-01');
  });
});
