<template>
  <main class="legacy-esheet">
    <header class="legacy-header">
      <h1>eSheet</h1>
      <div class="legacy-search">
        <input v-model="lot" aria-label="LOT" @keyup.enter="search" />
        <button type="button" aria-label="Search LOT" @click="search">⌕</button>
      </div>
      <nav aria-label="Operation type" class="legacy-modes">
        <button v-for="mode in modes" :key="mode" type="button" @click="selectMode(mode)">
          {{ mode }}
        </button>
      </nav>
    </header>

    <section class="legacy-summary" aria-label="LOT summary">
      <div class="legacy-summary__identity"><strong>5PP02</strong><b>W516</b></div>
      <div class="legacy-summary__status"><span>NORMAL</span><strong>18</strong><em>HOLD</em></div>
      <div class="legacy-processes">
        <span v-for="process in processSummary" :key="process">{{ process }}</span>
      </div>
    </section>

    <section class="legacy-grid-panel" aria-label="eSheet process table">
      <div class="legacy-grid-scroll">
        <table>
          <thead>
            <tr>
              <th>공정명</th>
              <th>C</th>
              <th>I</th>
              <th>O</th>
              <th>DESCRIPTION</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.name"
              :class="{ selected: selected === row.name }"
              @click="selected = row.name"
            >
              <td>{{ row.name }}</td>
              <td>{{ row.c }}</td>
              <td>{{ row.i }}</td>
              <td>{{ row.o }}</td>
              <td>{{ row.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <aside v-if="drawerOpen" class="legacy-drawer" aria-label="Legacy action drawer">
      <strong>{{ selected }}</strong>
      <input aria-label="Equipment" value="MPS Inc" readonly />
      <input aria-label="Machine" value="HP18E" readonly />
      <button type="button" @click="showMessage('PCM')">PCM</button>
      <button type="button" @click="drawerOpen = false">닫기</button>
    </aside>

    <footer class="legacy-footer">
      <button type="button" @click="drawerOpen = true">Mother Lot</button>
      <button type="button" @click="drawerOpen = true">PCM</button>
      <button type="button" @click="showMessage('F')">F</button>
      <button type="button" @click="showMessage('닫기')">닫기</button>
    </footer>
    <p v-if="message" class="legacy-feedback" role="status">{{ message }}</p>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface LegacyRow {
  name: string;
  c: number;
  i: number;
  o: number;
  description: string;
}

const modes = ['S', 'P', 'M'] as const;
const lot = ref('TJ00002');
const selected = ref('LG FI CD');
const drawerOpen = ref(false);
const message = ref('');
const processSummary = ['PTK PR COAT', 'DI/10 15:46', '#23.DH66CO'];
const rows: LegacyRow[] = [
  { name: 'LG FI CD', c: 0, i: 18, o: 18, description: '' },
  { name: 'MP01(TP(LINE))', c: 0, i: 0, o: 0, description: '.175±.021µm(.167 ~ ..' },
  { name: 'MP02(TP(LINE))', c: 0, i: 0, o: 0, description: '.577±.104µm(.504 ~ ..' },
  { name: 'MP03(CELL(LINE))', c: 0, i: 0, o: 0, description: '.165±.03µm(.144 ~ ..' },
  { name: 'MP04(TP(LINE))', c: 0, i: 0, o: 0, description: '.175±.032µm(.153 ~ ..' },
  { name: 'MP05(CELL(SPACE))', c: 0, i: 0, o: 0, description: '.283±.051µm(.247 ~ ..' },
  { name: 'LG POC', c: 0, i: 0, o: 0, description: '5M16-07,FM16-08' },
];

function search(): void {
  message.value = `Search: ${lot.value.toUpperCase()}`;
}
function selectMode(mode: (typeof modes)[number]): void {
  message.value = `Mode ${mode}`;
}
function showMessage(value: string): void {
  message.value = value;
}
</script>

<style scoped>
:global(body) {
  margin: 0;
}
.legacy-esheet {
  min-height: 100vh;
  color: #fff;
  background: #14065e;
  font-family: Arial, sans-serif;
}
.legacy-header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 14px 22px 10px;
}
h1 {
  margin: 0 auto 0 0;
  font-size: 21px;
}
.legacy-search {
  display: flex;
  gap: 5px;
}
.legacy-search input {
  width: 150px;
  height: 32px;
  box-sizing: border-box;
  border: 0;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 16px;
}
button {
  border: 0;
  border-radius: 4px;
  color: #fff;
  background: #168ff0;
  cursor: pointer;
  font-weight: 700;
}
.legacy-search button {
  width: 36px;
  font-size: 23px;
}
.legacy-modes {
  display: flex;
  gap: 5px;
}
.legacy-modes button {
  width: 36px;
  height: 36px;
  background: #00c8b7;
  font-size: 16px;
}
.legacy-modes button:nth-child(2) {
  background: #7549f4;
}
.legacy-modes button:nth-child(3) {
  background: #3b63ef;
}
.legacy-summary {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 5px;
  padding: 0 22px 8px;
  background: #14065e;
}
.legacy-summary__identity,
.legacy-summary__status {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 25px;
}
.legacy-summary__identity strong {
  border-left: 4px solid #00e783;
  padding-left: 7px;
}
.legacy-summary__identity b {
  padding: 2px 12px;
  color: #111;
  background: #b4ff22;
}
.legacy-summary__status span {
  padding: 2px 5px;
  color: #111;
  background: #eee;
}
.legacy-summary__status strong {
  padding: 2px 12px;
  background: #83c8db;
}
.legacy-summary__status em {
  padding: 2px 8px;
  font-style: normal;
  background: #f00;
}
.legacy-processes {
  grid-column: 1 / -1;
  display: grid;
  gap: 5px;
}
.legacy-processes span {
  border-left: 4px solid #00e783;
  padding-left: 7px;
}
.legacy-grid-panel {
  padding: 0 2px 56px;
  background: #eee;
}
.legacy-grid-scroll {
  overflow: auto;
}
table {
  width: 100%;
  min-width: 620px;
  border-collapse: collapse;
  color: #111;
  font-size: 14px;
}
th,
td {
  border: 1px solid #aaa;
  padding: 8px 6px;
  text-align: left;
  white-space: nowrap;
}
th {
  position: sticky;
  top: 0;
  color: #777;
  background: #e8edf0;
  font-weight: 400;
}
th:not(:first-child),
td:not(:first-child) {
  text-align: center;
}
tr.selected td {
  background: #d6d6d6;
}
.legacy-drawer {
  position: fixed;
  right: 0;
  bottom: 0;
  width: min(100%, 360px);
  box-sizing: border-box;
  display: grid;
  gap: 8px;
  padding: 12px 22px 10px;
  color: #222;
  background: #f5f5f5;
  box-shadow: 0 -3px 8px #0004;
}
.legacy-drawer input {
  height: 34px;
  box-sizing: border-box;
  border: 1px solid #bbb;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 16px;
}
.legacy-drawer button {
  min-height: 34px;
}
.legacy-drawer button:last-child {
  color: #fff;
  background: #14065e;
}
.legacy-footer {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
  padding: 6px 22px;
  background: #14065e;
}
.legacy-footer button {
  min-height: 34px;
}
.legacy-feedback {
  position: fixed;
  right: 10px;
  top: 10px;
  margin: 0;
  padding: 6px 10px;
  border-radius: 4px;
  background: #222c;
}
@media (min-width: 700px) {
  .legacy-esheet {
    max-width: 420px;
    margin: 0 auto;
  }
}
</style>
