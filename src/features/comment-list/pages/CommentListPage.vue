<template>
  <main class="comment-list-page">
    <section class="comment-list-shell" aria-labelledby="comment-list-title">
      <q-toolbar class="comment-list-titlebar">
        <q-toolbar-title id="comment-list-title">COMMENT LIST</q-toolbar-title>
      </q-toolbar>

      <div class="comment-list-content">
        <q-card
          flat
          bordered
          class="comment-list-card comment-list-summary"
          aria-label="Lot and process summary"
        >
          <q-card-section class="comment-list-summary-fields">
            <div class="comment-list-field comment-list-field--lot">
              <span class="comment-list-label">LOT No.</span>
              <output class="comment-list-value">{{ formatNullable(context.lotId) }}</output>
            </div>

            <div class="comment-list-row">
              <div class="comment-list-field">
                <span class="comment-list-label">공정번호</span>
                <output class="comment-list-value">{{ formatNullable(processNumber) }}</output>
              </div>
              <div class="comment-list-field comment-list-field--step">
                <output class="comment-list-value">{{
                  formatNullable(context.processStep)
                }}</output>
              </div>
            </div>

            <div class="comment-list-row comment-list-row--read">
              <div class="comment-list-field">
                <span class="comment-list-label">No.</span>
                <output class="comment-list-value comment-list-value--selected">
                  {{ formatNullable(selectedCommentNo) }}
                </output>
              </div>
              <BaseButton class="comment-list-read" variant="secondary" @click="handleRead">
                읽기
              </BaseButton>
            </div>
          </q-card-section>
        </q-card>

        <q-card
          flat
          bordered
          class="comment-list-card comment-list-table-card"
          aria-label="Comment grid"
        >
          <q-banner v-if="errorMessage" rounded class="comment-list-alert" role="alert">
            {{ errorMessage }}
          </q-banner>

          <div class="comment-list-grid-wrap">
            <div v-if="isLoading" class="comment-list-loading">
              <BaseLoading size="small" />
              COMMENT LIST 조회 중...
            </div>
            <BaseRevoGrid
              v-else
              class="comment-list-grid"
              :rows="gridRows"
              :columns="gridColumns"
              row-key="gridKey"
              :selected-row-key="selectedCommentNo || undefined"
              selected-row-class="comment-list-grid-row--selected"
              :row-size="40"
              :resize="false"
              :style="{ '--comment-grid-viewport-height': gridViewportHeight }"
              @row-select="selectComment(String($event))"
              @dblclick="handleGridDoubleClick"
            />
          </div>
        </q-card>
      </div>

      <footer class="comment-list-footer">
        <BaseButton
          class="comment-list-close"
          variant="tertiary"
          size="large"
          block
          @click="handleClose"
        >
          닫기
        </BaseButton>
      </footer>
    </section>

    <BaseModal v-model:open="isDetailOpen" :width="440" closable class="comment-list-detail-modal">
      <template #title>
        <div class="comment-list-detail-title">
          <span class="comment-list-detail-kicker">COMMENT LIST</span>
          <h2 id="comment-list-detail-title">COMMENT VIEW</h2>
        </div>
      </template>
      <template #closeIcon>
        <q-icon name="sym_o_close" aria-hidden="true" />
      </template>

      <dl class="comment-list-detail">
        <div class="comment-list-detail-field--full">
          <dt>LOT</dt>
          <dd>{{ formatNullable(context.lotId) }}</dd>
        </div>
        <div>
          <dt>Comment No</dt>
          <dd>{{ activeComment?.no }}</dd>
        </div>
        <div>
          <dt>Read status</dt>
          <dd>
            <BaseChip
              class="comment-list-status-chip"
              :class="
                activeComment?.isCheck
                  ? 'comment-list-status-chip--read'
                  : 'comment-list-status-chip--unread'
              "
              size="small"
              :label="activeComment?.isCheck ? 'Read' : 'Unread'"
              disabled
              role="status"
            />
          </dd>
        </div>
        <div>
          <dt>Operation</dt>
          <dd>{{ processNumber }}</dd>
        </div>
        <div>
          <dt>Sub</dt>
          <dd>{{ activeComment?.subOperation || '-' }}</dd>
        </div>
        <div>
          <dt>W</dt>
          <dd>{{ activeComment?.workCode || '-' }}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{{ activeComment?.trackType || '-' }}</dd>
        </div>
        <div>
          <dt>Author</dt>
          <dd>{{ activeComment?.writer || '-' }}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{{ activeComment?.writeTime || '-' }}</dd>
        </div>
        <div>
          <dt>Reader</dt>
          <dd>{{ activeComment?.reader || '-' }}</dd>
        </div>
        <div>
          <dt>Read Time</dt>
          <dd>{{ activeComment?.readTime || '-' }}</dd>
        </div>
        <div class="comment-list-detail-field--full comment-list-detail-description">
          <dt>Description</dt>
          <dd>{{ activeComment?.description || '-' }}</dd>
        </div>
      </dl>

      <template #footer>
        <BaseButton class="comment-list-detail-close" @click="isDetailOpen = false"
          >닫기</BaseButton
        >
      </template>
    </BaseModal>
  </main>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue';
import { routeLocationKey } from 'vue-router';

import {
  BaseButton,
  BaseChip,
  BaseLoading,
  BaseModal,
  BaseRevoGrid,
} from '../../../components/base';
import type { BaseRevoGridColumn } from '../../../components/base/revo-grid';
import { queryString } from '../../move-out/utils/route-query';
import { defaultCommentListContext, mockCommentItems } from '../mocks/comment-list.mock';
import { fetchCommentList } from '../services/comment-list.service';
import type { CommentListContext, CommentListItem } from '../types/comment-list.types';

const route = inject(routeLocationKey, null);
const useMockData = import.meta.env.DEV && queryString(route, 'mock') === '1';
const isLoading = ref(true);
const errorMessage = ref('');
const selectedCommentNo = ref('');
const isDetailOpen = ref(false);

const context = ref<CommentListContext>({
  ...defaultCommentListContext,
  lotId: queryString(route, 'lotId', defaultCommentListContext.lotId),
  operation: queryString(route, 'operation', defaultCommentListContext.operation),
  subOperation: queryString(route, 'subOperation', defaultCommentListContext.subOperation),
  processStep: queryString(route, 'processStep', defaultCommentListContext.processStep),
  operSequence: queryString(route, 'operSequence', defaultCommentListContext.operSequence),
  facility: queryString(route, 'facility', defaultCommentListContext.facility),
});
const comments = ref<CommentListItem[]>([]);

const gridColumns: BaseRevoGridColumn[] = [
  { prop: 'no', name: 'NO', size: 64 },
  { prop: 'subOperation', name: 'SUB', size: 68 },
  { prop: 'workCode', name: 'W', size: 48 },
  { prop: 'trackType', name: 'TYPE', size: 96 },
  { prop: 'readState', name: 'R', size: 48 },
  { prop: 'writer', name: '작성자', size: 88 },
  { prop: 'writeTime', name: '작성일시', size: 160 },
  { prop: 'readerDisplay', name: '읽은사람', size: 120 },
  { prop: 'readTimeDisplay', name: '읽은시간', size: 160 },
];
const gridRows = computed(() =>
  comments.value.length
    ? comments.value.map((item) => ({
        ...item,
        gridKey: item.no,
        readState: formatReadState(item.isCheck),
        readerDisplay: item.reader || '-',
        readTimeDisplay: item.readTime || '-',
      }))
    : [1, 2].map((index) => ({
        gridKey: `placeholder-${index}`,
        rowClass: 'comment-list-grid-row--placeholder',
        no: '',
      })),
);
const gridViewportHeight = computed(() => `${40 + gridRows.value.length * 40 - 2}px`);

const processNumber = computed(() => `${context.value.operation}${context.value.subOperation}`);
const activeComment = computed(() =>
  comments.value.find((item) => item.no === selectedCommentNo.value),
);

onMounted(async () => {
  try {
    if (useMockData) {
      comments.value = mockCommentItems.map((item) => ({ ...item }));
    } else {
      const response = await fetchCommentList(context.value);
      context.value = response.context;
      comments.value = response.items;
    }
  } catch {
    errorMessage.value = 'Unable to load comment list.';
  } finally {
    isLoading.value = false;
  }
});

function selectComment(commentNo: string) {
  if (!comments.value.some((item) => item.no === commentNo)) return;
  selectedCommentNo.value = commentNo;
}

function handleGridDoubleClick() {
  if (selectedCommentNo.value) openCommentView(selectedCommentNo.value);
}

function handleRead() {
  if (!selectedCommentNo.value) {
    errorMessage.value = 'Comment를 선택 해 주세요';
    return;
  }

  openCommentView(selectedCommentNo.value);
}

function openCommentView(commentNo: string) {
  selectedCommentNo.value = commentNo;
  errorMessage.value = '';
  isDetailOpen.value = true;
}

function formatReadState(isCheck: boolean): string {
  return isCheck ? 'Y' : 'N';
}

function formatNullable(value: string): string {
  return value.trim() || 'Null';
}

function handleClose() {
  const androidBridge = (
    window as Window & {
      Android?: {
        close?: () => void;
        finish?: () => void;
      };
    }
  ).Android;

  if (typeof androidBridge?.finish === 'function') {
    androidBridge.finish();
    return;
  }

  if (typeof androidBridge?.close === 'function') {
    androidBridge.close();
    return;
  }

  window.history.back();
}
</script>

<style scoped>
.comment-list-page {
  --comment-shell-max-width: 360px;
  --comment-bg: linear-gradient(180deg, #1c493a 0%, #96b1a8 54%, #ecf8f1 100%);
  --comment-title-text: #ffffff;
  --comment-card-bg: #f9fafb;
  --comment-field-bg: #ffffff;
  --comment-field-border: #d1d5dc;
  --comment-field-text: #101828;
  --comment-label-text: #364153;
  --comment-grid-bg: #ffffff;
  --comment-grid-border: #cfd6df;
  --comment-grid-text: #1f2937;
  --comment-accent: #02b0a5;
  --comment-row-hover: #f0fdfc;
  --comment-row-selected: #d8fbf6;
  --comment-shadow: 0 8px 24px rgb(13 20 31 / 6%);

  box-sizing: border-box;
  width: 100vw;
  max-width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #d1d5dc;
  color: var(--comment-grid-text);
  font-family: var(--family-font-family-default, 'Noto Sans KR', sans-serif);
}

:global(html[data-theme='dark']) .comment-list-page,
:global(body[data-theme='dark']) .comment-list-page,
:global(.dark) .comment-list-page,
:global(.theme-dark) .comment-list-page {
  --comment-bg: linear-gradient(180deg, #0f2f27 0%, #284b43 54%, #101827 100%);
  --comment-title-text: #f8fafc;
  --comment-card-bg: #111827;
  --comment-field-bg: #172033;
  --comment-field-border: #354156;
  --comment-field-text: #f8fafc;
  --comment-label-text: #f8fafc;
  --comment-grid-bg: #111827;
  --comment-grid-border: #354156;
  --comment-grid-text: #e5e7eb;
  --comment-row-hover: #19324a;
  --comment-row-selected: #155e75;
  --comment-shadow: 0 8px 24px rgb(0 0 0 / 20%);
}

.comment-list-shell {
  display: flex;
  max-width: var(--comment-shell-max-width);
  height: 100%;
  width: 100%;
  margin: 0 auto;
  flex-direction: column;
  overflow: hidden;
  background: var(--comment-bg);
}

.comment-list-shell,
.comment-list-content,
.comment-list-card,
.comment-list-table-card,
.comment-list-footer {
  box-sizing: border-box;
}

.comment-list-shell,
.comment-list-content,
.comment-list-card,
.comment-list-field,
.comment-list-table-card {
  min-width: 0;
}

.comment-list-shell,
.comment-list-content,
.comment-list-table-card,
.comment-list-grid-wrap {
  min-height: 0;
}

.comment-list-titlebar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  padding: 16px;
  color: var(--comment-title-text);
}

.comment-list-titlebar :deep(.q-toolbar__title) {
  flex: 0 1 auto;
  margin: 0;
  padding: 0;
  font-size: 18px;
  font-weight: var(--ds-font-weight-bold);
  line-height: 28px;
  letter-spacing: 0;
  text-align: center;
}

.comment-list-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  overflow: hidden;
  padding: 11px;
}

.comment-list-card {
  flex: none;
  border: 1px solid var(--comment-field-border);
  border-radius: 4px;
  background: var(--comment-card-bg);
  box-shadow: var(--comment-shadow);
}

.comment-list-summary {
  height: 208px;
  padding: 11px 12px;
}

.comment-list-summary-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
}

.comment-list-row {
  display: flex;
  gap: 8px;
  height: 56px;
  align-items: stretch;
}

.comment-list-row:not(.comment-list-row--read) .comment-list-field:first-child {
  flex: 0 0 43.6%;
}

.comment-list-field {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  height: 56px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--comment-field-border);
  border-radius: 4px 4px 0 0;
  background: var(--comment-field-bg);
}

.comment-list-field--lot {
  width: 100%;
}

.comment-list-label {
  color: var(--comment-label-text);
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
}

.comment-list-value {
  display: block;
  overflow: hidden;
  color: var(--comment-field-text);
  font-size: 16px;
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-list-value--selected {
  min-width: 0;
}

.comment-list-read,
.comment-list-close {
  font-weight: var(--ds-font-weight-bold);
}

.comment-list-read {
  --ds-btn-bg: transparent;
  --ds-btn-border-color: var(--comment-accent);
  --ds-btn-fg: var(--comment-accent);
  --ds-btn-height: 40px;

  width: 50px;
  min-height: 40px;
  height: 40px;
  padding: 0 8px;
  flex: none;
  align-self: center;
  border-radius: 4px;
  background: transparent;
}

.comment-list-read :deep(.q-btn__content) {
  white-space: nowrap;
}

.comment-list-table-card {
  position: relative;
  flex: 1;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
}

.comment-list-grid-wrap {
  width: 100%;
  height: 100%;
}

.comment-list-alert {
  margin: 8px;
  background: var(--comment-row-hover);
  color: var(--comment-grid-text);
}

.comment-list-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: var(--comment-grid-text);
}

.comment-list-grid {
  --base-revo-grid-border-color: var(--comment-accent);
  --base-revo-grid-radius: 4px;
  --base-revo-grid-scroll-color: var(--comment-accent);
  --base-revo-grid-vertical-right: -8px;
  --base-revo-grid-vertical-height: 127px;
  --base-revo-grid-horizontal-bottom: -8px;
  --base-revo-grid-horizontal-left: -4px;
  --base-revo-grid-horizontal-width: 95px;
  --base-revo-grid-horizontal-height: 4px;

  height: 100%;
}

.comment-list-grid :deep(.base-revo-grid__viewport) {
  height: min(100%, var(--comment-grid-viewport-height));
}

.comment-list-grid :deep(revo-grid) {
  --revo-grid-header-height: 40px;
  --revo-grid-font-family: var(--family-font-family-default, 'Noto Sans KR', sans-serif);
  --revo-grid-font-size: 13px;
  --revo-grid-header-font-size: 13px;
  --revo-grid-header-font-weight: 700;
  --revo-grid-header-text-align: center;
  --revo-grid-header-bg: var(--comment-accent);
  --revo-grid-text: var(--comment-grid-text);

  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.comment-list-grid :deep(.rgHeaderCell) {
  box-sizing: border-box;
  border-inline-end: 1px solid #f9fafb;
  padding: 0 4px;
  background: var(--comment-accent);
  color: #f9fafb;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}

.comment-list-grid :deep(.rgHeaderCell .header-content) {
  position: absolute;
  inset: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 0 4px;
  text-align: center;
  text-transform: none;
}

.comment-list-grid :deep(.rgHeaderCell .header-controls) {
  display: none;
}

.comment-list-grid :deep(.rgCell) {
  box-sizing: border-box;
  overflow: hidden;
  border-inline-end: 1px solid var(--comment-grid-border);
  border-block-end: 1px solid var(--comment-grid-border);
  padding: 9px 6px;
  background: var(--comment-grid-bg);
  color: var(--comment-grid-text);
  font-size: 13px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-list-grid :deep(.comment-list-grid-row--selected .rgCell) {
  background: var(--comment-row-selected);
  font-weight: 700;
}

.comment-list-grid :deep(.comment-list-grid-row--placeholder .rgCell) {
  pointer-events: none;
}

.comment-list-grid :deep(.base-revo-grid__scroll-indicator--horizontal[aria-valuemax='0']) {
  display: none;
}

.comment-list-footer {
  flex: none;
  height: 68px;
  padding: 12px;
}

.comment-list-close {
  --ds-btn-height: 44px;

  min-height: 44px;
  width: 100%;
  border: 1px solid var(--comment-field-border);
  border-radius: 4px;
  background: var(--comment-field-bg);
  color: var(--comment-grid-text);
}

:global(.comment-list-detail-modal .ds-modal) {
  --comment-card-bg: #f9fafb;
  --comment-field-bg: #ffffff;
  --comment-field-border: #d1d5dc;
  --comment-field-text: #101828;
  --comment-label-text: #364153;
  --comment-grid-text: #1f2937;

  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 32px);
  overflow: hidden;
  border-radius: 12px;
  color: var(--comment-grid-text);
  background: var(--comment-field-bg);
  box-shadow: 0 16px 48px rgb(0 0 0 / 22%);
  font-family: var(--family-font-family-default, 'Noto Sans KR', sans-serif);
}

:global(html[data-theme='dark'] .comment-list-detail-modal .ds-modal),
:global(body[data-theme='dark'] .comment-list-detail-modal .ds-modal),
:global(.dark .comment-list-detail-modal .ds-modal),
:global(.theme-dark .comment-list-detail-modal .ds-modal) {
  --comment-card-bg: #111827;
  --comment-field-bg: #172033;
  --comment-field-border: #354156;
  --comment-field-text: #f8fafc;
  --comment-label-text: #f8fafc;
  --comment-grid-text: #e5e7eb;
}

:global(.comment-list-detail-modal .ds-modal__container) {
  max-height: calc(100dvh - 32px);
}

:global(.comment-list-detail-modal .ds-modal__header) {
  padding: 16px 20px;
  background: #1c493a;
  color: #ffffff;
}

.comment-list-detail-title h2 {
  margin: 2px 0 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 26px;
}

:global(.comment-list-detail-modal .ds-modal__title) {
  color: #ffffff;
}

.comment-list-detail-kicker {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  opacity: 0.8;
}

:global(.comment-list-detail-modal .ds-modal__close-btn) {
  color: #ffffff;
}

:global(.comment-list-detail-modal .ds-modal__close-btn:hover) {
  background: rgb(255 255 255 / 12%);
  color: #ffffff;
}

:global(.comment-list-detail-modal .ds-modal__close-btn .q-icon) {
  font-size: 22px;
}

:global(.comment-list-detail-modal .ds-modal__body) {
  flex: 1;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 16px;
  background: var(--comment-field-bg);
}

.comment-list-detail {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.comment-list-detail > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--comment-field-border);
  border-radius: 8px;
  background: var(--comment-card-bg);
}

.comment-list-detail .comment-list-detail-field--full {
  grid-column: 1 / -1;
}

.comment-list-detail dt {
  color: var(--comment-label-text);
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
}

.comment-list-detail dd {
  margin: 0;
  color: var(--comment-field-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  overflow-wrap: anywhere;
}

:global(.comment-list-detail-modal .comment-list-status-chip.ds-chip.disabled) {
  height: 24px;
  min-height: 24px;
  padding: 2px 8px;
  cursor: default;
}

:global(.comment-list-detail-modal .comment-list-status-chip--read.ds-chip.disabled) {
  border-color: var(--q-positive, #21ba45);
  background-color: var(--q-positive, #21ba45);
  color: #ffffff;
}

:global(.comment-list-detail-modal .comment-list-status-chip--unread.ds-chip.disabled) {
  border-color: var(--q-warning, #f2c037);
  background-color: var(--q-warning, #f2c037);
  color: #101828;
}

.comment-list-detail-description dd {
  font-weight: 400;
  line-height: 22px;
  white-space: pre-wrap;
}

:global(.comment-list-detail-modal .ds-modal__footer) {
  padding: 12px 16px;
  border-top: 1px solid var(--comment-field-border);
  background: var(--comment-field-bg);
}

.comment-list-detail-close {
  min-width: 96px;
}
</style>
