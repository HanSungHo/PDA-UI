<template>
  <main class="comment-list-page">
    <section class="comment-list-shell" aria-labelledby="comment-list-title">
      <header class="comment-list-titlebar">
        <button class="comment-list-back" type="button" aria-label="Back" @click="handleClose">
          <span aria-hidden="true" />
        </button>
        <h1 id="comment-list-title">COMMENT LIST</h1>
      </header>

      <div class="comment-list-content">
        <section
          class="comment-list-card comment-list-summary"
          aria-label="Lot and process summary"
        >
          <div class="comment-list-field comment-list-field--lot">
            <span class="comment-list-label">LOT No.</span>
            <output class="comment-list-value">{{ context.lotId }}</output>
          </div>

          <div class="comment-list-row">
            <div class="comment-list-field">
              <span class="comment-list-label">Process Number</span>
              <output class="comment-list-value">{{ processNumber }}</output>
            </div>
            <div class="comment-list-field comment-list-field--step">
              <output class="comment-list-value">{{ context.processStep }}</output>
            </div>
          </div>

          <div class="comment-list-row comment-list-row--read">
            <div class="comment-list-field">
              <span class="comment-list-label">No</span>
              <output class="comment-list-value comment-list-value--selected">
                {{ selectedCommentNo }}
              </output>
            </div>
            <BaseButton
              class="comment-list-read"
              variant="secondary"
              size="large"
              @click="handleRead"
            >
              Read
            </BaseButton>
          </div>
        </section>

        <section class="comment-list-card comment-list-table-card" aria-label="Comment grid">
          <a-alert
            v-if="errorMessage"
            type="warning"
            show-icon
            :message="errorMessage"
            class="comment-list-alert"
          />

          <div class="comment-list-grid-wrap">
            <div v-if="isLoading" class="comment-list-loading">Loading comment list...</div>

            <table v-else class="comment-list-grid">
              <thead>
                <tr>
                  <th v-for="column in columns" :key="column.key" scope="col">
                    {{ column.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in comments"
                  :key="item.no"
                  :class="{ 'is-selected': item.no === selectedCommentNo }"
                  tabindex="0"
                  @click="selectComment(item.no)"
                  @dblclick="openCommentView(item.no)"
                  @keyup.enter="selectComment(item.no)"
                >
                  <td data-label="NO">{{ item.no }}</td>
                  <td data-label="SUB">{{ item.subOperation }}</td>
                  <td data-label="W">{{ item.workCode }}</td>
                  <td data-label="TYPE">{{ item.trackType }}</td>
                  <td data-label="R">{{ formatReadState(item.isCheck) }}</td>
                  <td data-label="Author">{{ item.writer }}</td>
                  <td data-label="Created at">{{ item.writeTime }}</td>
                  <td data-label="Read">{{ item.reader || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <footer class="comment-list-footer">
        <BaseButton
          class="comment-list-close"
          variant="tertiary"
          size="large"
          block
          @click="handleClose"
        >
          Close
        </BaseButton>
      </footer>
    </section>

    <a-modal v-model:open="isDetailOpen" title="COMMENT VIEW" :footer="null">
      <dl class="comment-list-detail">
        <div>
          <dt>LOT</dt>
          <dd>{{ context.lotId }}</dd>
        </div>
        <div>
          <dt>Comment No</dt>
          <dd>{{ activeComment?.no }}</dd>
        </div>
        <div>
          <dt>Operation</dt>
          <dd>{{ context.operation }}{{ context.subOperation }}</dd>
        </div>
        <div>
          <dt>Description</dt>
          <dd>{{ activeComment?.description }}</dd>
        </div>
      </dl>
    </a-modal>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { BaseButton } from '../../../components/base';
import { fetchCommentList } from '../services/comment-list.service';
import type { CommentListContext, CommentListItem } from '../types/comment-list.types';

const isLoading = ref(true);
const errorMessage = ref('');
const selectedCommentNo = ref('');
const isDetailOpen = ref(false);

const context = ref<CommentListContext>({
  lotId: '',
  operation: '',
  subOperation: '',
  processStep: '',
  operSequence: '',
  facility: '',
});
const comments = ref<CommentListItem[]>([]);

const columns = [
  { key: 'no', label: 'NO' },
  { key: 'subOperation', label: 'Sub' },
  { key: 'workCode', label: 'W' },
  { key: 'trackType', label: 'TYPE' },
  { key: 'isCheck', label: 'R' },
  { key: 'writer', label: 'Author' },
  { key: 'writeTime', label: 'Created at' },
  { key: 'reader', label: 'Read' },
];

const processNumber = computed(() => `${context.value.operation}${context.value.subOperation}`);
const activeComment = computed(() =>
  comments.value.find((item) => item.no === selectedCommentNo.value),
);

onMounted(async () => {
  try {
    const response = await fetchCommentList();
    context.value = response.context;
    comments.value = response.items;
  } catch {
    errorMessage.value = 'Unable to load comment list.';
  } finally {
    isLoading.value = false;
  }
});

function selectComment(commentNo: string) {
  selectedCommentNo.value = commentNo;
}

function handleRead() {
  if (!selectedCommentNo.value) {
    errorMessage.value = 'Please select a Comment.';
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
  --comment-bg: linear-gradient(180deg, #1c493a 0%, #96b1a8 54%, #ecf8f1 100%);
  --comment-title-text: #ffffff;
  --comment-card-bg: #f9fafb;
  --comment-field-bg: #ffffff;
  --comment-field-border: #d1d5dc;
  --comment-field-text: #6a7282;
  --comment-label-text: #030712;
  --comment-grid-bg: #ffffff;
  --comment-grid-heading: #f0fdfc;
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
  background: var(--comment-bg);
  color: var(--comment-grid-text);
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
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
  --comment-grid-heading: #1f2a3d;
  --comment-grid-border: #354156;
  --comment-grid-text: #e5e7eb;
  --comment-row-hover: #19324a;
  --comment-row-selected: #155e75;
  --comment-shadow: 0 8px 24px rgb(0 0 0 / 20%);
}

.comment-list-shell {
  display: flex;
  height: 100%;
  width: 100%;
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
  gap: 6.667px;
  min-height: 66.667px;
  padding: 13.333px;
  color: var(--comment-title-text);
}

.comment-list-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--comment-title-text);
  cursor: pointer;
}

.comment-list-back span {
  width: 11px;
  height: 11px;
  border-bottom: 2px solid currentcolor;
  border-left: 2px solid currentcolor;
  transform: rotate(45deg);
}

.comment-list-titlebar h1 {
  flex: 1;
  margin: 0;
  font-size: 14px;
  font-weight: var(--ds-font-weight-bold);
  line-height: 20px;
  letter-spacing: 0;
}

.comment-list-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6.667px;
  padding: 12px 13.333px 0;
}

.comment-list-card {
  flex: none;
  border: 1px solid var(--comment-field-border);
  border-radius: 8px;
  background: var(--comment-card-bg);
  box-shadow: var(--comment-shadow);
}

.comment-list-summary {
  display: flex;
  flex-direction: column;
  height: 202px;
  gap: 8px;
  padding: 8px;
}

.comment-list-row {
  display: flex;
  gap: 3.333px;
  align-items: flex-end;
}

.comment-list-field {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.comment-list-field--lot {
  width: 100%;
}

.comment-list-field--step {
  align-self: flex-end;
}

.comment-list-label {
  color: var(--comment-label-text);
  font-size: 12px;
  font-weight: var(--ds-font-weight-medium);
  line-height: 16px;
}

.comment-list-value {
  display: flex;
  min-height: 36.667px;
  align-items: center;
  overflow: hidden;
  padding: 8px;
  border: 1px solid var(--comment-field-border);
  border-radius: 8px;
  background: var(--comment-field-bg);
  color: var(--comment-field-text);
  font-size: 12px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-list-value--selected {
  min-width: 0;
}

.comment-list-read,
.comment-list-close {
  min-height: 36.667px;
  border-radius: 6.667px;
  font-weight: var(--ds-font-weight-semibold);
}

.comment-list-read {
  --ds-btn-height: 36.667px;
  --ds-btn-padding-x: 10px;
  --ds-btn-radius: 6.667px;
  --ds-btn-font-size: 12.667px;
  --ds-btn-line-height: 18.333px;
  --ds-btn-accent: var(--comment-accent);
  --ds-btn-accent-strong: #02897f;

  width: 51px;
  flex: none;
  background: transparent;
}

.comment-list-table-card {
  flex: 1;
  position: relative;
  padding: 9.333px 10.667px;
}

.comment-list-grid-wrap {
  height: 100%;
  overflow: auto;
  scrollbar-color: var(--comment-accent) transparent;
  scrollbar-width: thin;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.comment-list-grid-wrap::-webkit-scrollbar {
  width: 3px;
  height: 3px;
}

.comment-list-grid-wrap::-webkit-scrollbar-thumb {
  border-radius: 99px;
  background: var(--comment-accent);
}

.comment-list-alert {
  margin: 8px;
}

.comment-list-loading {
  padding: 24px;
  color: var(--comment-grid-text);
}

.comment-list-grid {
  width: 100%;
  min-width: 560px;
  border: 1px solid var(--comment-accent);
  border-radius: 6.667px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  background: var(--comment-grid-bg);
  color: var(--comment-grid-text);
  font-size: 10px;
}

.comment-list-grid th,
.comment-list-grid td {
  overflow: hidden;
  height: 36.667px;
  padding: 8px;
  border-right: 1px solid var(--comment-grid-border);
  border-bottom: 1px solid var(--comment-grid-border);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-list-grid th:last-child,
.comment-list-grid td:last-child {
  border-right: 0;
}

.comment-list-grid tbody tr:last-child td {
  border-bottom: 0;
}

.comment-list-grid th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--comment-accent);
  color: #ffffff;
  font-weight: var(--ds-font-weight-bold);
}

.comment-list-grid tr {
  cursor: pointer;
}

.comment-list-grid tbody tr:hover,
.comment-list-grid tbody tr:focus {
  background: var(--comment-row-hover);
  outline: none;
}

.comment-list-grid tbody tr.is-selected {
  background: var(--comment-row-selected);
  font-weight: var(--ds-font-weight-bold);
}

.comment-list-footer {
  flex: none;
  padding: 10px 13.333px 20px;
}

.comment-list-close {
  --ds-btn-height: 41.667px;
  --ds-btn-radius: 8px;
  --ds-btn-font-size: 12.667px;
  --ds-btn-line-height: 18.333px;

  min-height: 41.667px;
  width: 100%;
  border: 1px solid var(--comment-field-border);
  border-radius: 8px;
  background: #ffffff;
  color: #101828;
  text-transform: uppercase;
}

.comment-list-detail {
  display: grid;
  gap: 12px;
  margin: 0;
}

.comment-list-detail div {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
}

.comment-list-detail dt {
  font-weight: var(--ds-font-weight-bold);
}

.comment-list-detail dd {
  margin: 0;
}
</style>
