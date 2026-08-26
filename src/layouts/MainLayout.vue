<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider v-model:collapsed="collapsed" :trigger="null" collapsible>
      <div class="logo">ATOP26</div>
      <a-menu v-model:selected-keys="selectedKeys" theme="dark" mode="inline">
        <a-menu-item-group title="Essential Links">
          <a-menu-item v-for="link in linksList" :key="link.label">
            <template #icon>
              <span v-if="link.icon">{{ link.icon }}</span>
            </template>
            <a :href="link.link" target="_blank">{{ link.label }}</a>
          </a-menu-item>
        </a-menu-item-group>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header style="background: #fff; padding: 0; display: flex; align-items: center">
        <a-button
          type="text"
          size="large"
          :icon="collapsed ? MenuUnfoldOutlined : MenuFoldOutlined"
          @click="collapsed = !collapsed"
        />
        <span style="margin-left: 16px; font-size: 18px; font-weight: bold">ATOP26-SMART</span>
      </a-layout-header>
      <a-layout-content style="margin: 24px 16px">
        <router-view />
      </a-layout-content>
      <a-layout-footer style="text-align: center">
        Ant Design Vue ©2024 Created by ATOP26
      </a-layout-footer>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons-vue';
import { ref } from 'vue';

interface EssentialLinkProps {
  label: string;
  caption?: string;
  link?: string;
  icon?: string;
}

const linksList: EssentialLinkProps[] = [
  {
    label: 'Ant Design Vue',
    caption: 'antdv.com',
    icon: 'book',
    link: 'https://www.antdv.com/',
  },
  {
    label: 'GitHub',
    caption: 'github.com/vueComponent',
    icon: 'github',
    link: 'https://github.com/vueComponent/ant-design-vue',
  },
  {
    label: 'Vue.js',
    caption: 'vuejs.org',
    icon: 'code',
    link: 'https://vuejs.org/',
  },
  {
    label: 'Vite',
    caption: 'vitejs.dev',
    icon: 'rocket',
    link: 'https://vitejs.dev/',
  },
  {
    label: 'Vue Router',
    caption: 'router.vuejs.org',
    icon: 'link',
    link: 'https://router.vuejs.org/',
  },
  {
    label: 'Pinia',
    caption: 'pinia.vuejs.org',
    icon: 'database',
    link: 'https://pinia.vuejs.org/',
  },
  {
    label: 'ATOP26',
    caption: 'Smart Solutions',
    icon: 'star',
    link: 'https://atop26.com',
  },
];

const collapsed = ref(false);
const selectedKeys = ref<string[]>([]);
</script>

<style scoped>
.logo {
  height: 32px;
  margin: 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
}
</style>
