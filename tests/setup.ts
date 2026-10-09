import { config } from '@vue/test-utils';
import Antd from 'ant-design-vue';
import * as AllQuasar from 'quasar';
import { Notify, Quasar } from 'quasar';
import { defineComponent, h, Teleport } from 'vue';

if (typeof document !== 'undefined' && !document.execCommand) {
  document.execCommand = () => true;
}

const QDialogStub = defineComponent({
  name: 'QDialog',
  inheritAttrs: false,
  props: {
    modelValue: { type: Boolean, default: false },
    persistent: { type: Boolean, default: false },
    noEscDismiss: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'hide', 'show'],
  setup(props, { slots, attrs }) {
    return () =>
      h(
        Teleport,
        { to: 'body' },
        props.modelValue
          ? [
              h(
                'div',
                {
                  ...attrs,
                  class: ['q-dialog q-dialog--stub', attrs.class],
                },
                slots.default?.(),
              ),
            ]
          : [],
      );
  },
});

config.global.plugins = [
  [Quasar, { plugins: { Notify }, components: { ...AllQuasar, QDialog: QDialogStub } }],
  Antd,
];
