import { config } from '@vue/test-utils';
import Antd from 'ant-design-vue';
import { Quasar } from 'quasar';

config.global.plugins = [Quasar, Antd];
