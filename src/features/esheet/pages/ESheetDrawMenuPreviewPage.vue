<template>
  <main
    class="esheet-draw-menu-preview"
    :class="{ 'esheet-draw-menu-preview--drawer-open': previewState.open }"
  >
    <section class="esheet-draw-menu-preview__sheet" aria-label="Mock eSheet background">
      <header class="esheet-draw-menu-preview__sheet-header">
        <button type="button" aria-label="Back">←</button>
        <strong>eSheet</strong>
      </header>
      <div class="esheet-draw-menu-preview__search">WIP00001</div>
      <div class="esheet-draw-menu-preview__badges">
        <span>PHOTO</span>
        <span>WIP</span>
      </div>
      <ul class="esheet-draw-menu-preview__rows">
        <li>BLABC COATING</li>
        <li>
          <button
            type="button"
            class="esheet-draw-menu-preview__row-trigger esheet-draw-menu-preview__row--active"
            data-testid="draw-menu-trigger"
            @click="openDrawer"
          >
            BLABC COATING
          </button>
        </li>
        <li>PR COATING</li>
        <li>Exposure</li>
        <li>Develop</li>
        <li>DI</li>
        <li>Develop Inspection</li>
      </ul>
    </section>

    <DrawMenuList v-bind="previewState" @close="handleClose" @select-action="handleSelectAction" />
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';

import { type DrawMenuActionItem, DrawMenuList } from '../components/draw-menu-list';
import { drawMenuPreviewProps } from '../mocks/draw-menu.mock';

defineOptions({ name: 'ESheetDrawMenuPreviewPage' });

const previewState = reactive({ ...drawMenuPreviewProps });
const lastAction = ref<DrawMenuActionItem | null>(null);

function handleClose(): void {
  previewState.open = false;
}

function openDrawer(): void {
  previewState.open = true;
}

function handleSelectAction(action: DrawMenuActionItem): void {
  lastAction.value = action;
  previewState.selectedAction = action.id;
}
</script>

<style scoped>
.esheet-draw-menu-preview {
  position: relative;
  min-height: calc(100vh - 112px);
  overflow: hidden;
  background: #f8fafc;
}

.esheet-draw-menu-preview__sheet {
  width: 44%;
  min-width: 320px;
  min-height: calc(100vh - 112px);
  padding: 52px 40px;
  color: #101828;
  transition:
    filter 180ms ease,
    opacity 180ms ease;
}

.esheet-draw-menu-preview--drawer-open .esheet-draw-menu-preview__sheet {
  filter: blur(6px);
  opacity: 0.34;
}

.esheet-draw-menu-preview__sheet-header {
  display: flex;
  align-items: center;
  gap: 28px;
  font-size: 32px;
}

.esheet-draw-menu-preview__sheet-header button {
  width: 72px;
  height: 72px;
  border: 0;
  background: transparent;
  font-size: 36px;
}

.esheet-draw-menu-preview__search {
  height: 92px;
  margin-top: 48px;
  padding: 26px 36px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #ffffff;
  font-size: 28px;
}

.esheet-draw-menu-preview__badges {
  display: flex;
  gap: 16px;
  margin-top: 36px;
  font-size: 24px;
  font-weight: 700;
}

.esheet-draw-menu-preview__badges span {
  padding: 8px 20px;
  border-radius: 14px;
  background: #d0fafe;
  color: #0a91b3;
}

.esheet-draw-menu-preview__rows {
  display: flex;
  flex-direction: column;
  margin: 36px 0 0;
  padding: 0;
  gap: 22px;
  list-style: none;
  font-size: 28px;
  font-weight: 700;
}

.esheet-draw-menu-preview__rows li {
  padding: 18px 0;
}

.esheet-draw-menu-preview__row-trigger {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.esheet-draw-menu-preview__row--active {
  color: #6366f1;
}

.esheet-draw-menu-preview__event {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 50;
  width: min(360px, calc(100vw - 48px));
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #101828;
  font-size: 12px;
  box-shadow: 0 8px 20px rgb(16 24 40 / 12%);
}

.esheet-draw-menu-preview__event-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.esheet-draw-menu-preview__event-header button {
  border: 1px solid #d1d5dc;
  border-radius: 6px;
  background: #ffffff;
  color: #101828;
  font: inherit;
  cursor: pointer;
}

.esheet-draw-menu-preview__event pre {
  max-height: 160px;
  margin: 8px 0 0;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
