<template>
  <main class="index-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">ATOP26-SMART / UI KIT</p>
        <h1>Quasar component gallery</h1>
        <p class="page-intro">Common controls, navigation, feedback, and data display.</p>
      </div>
      <q-badge color="teal-1" text-color="teal-10" label="QUASAR 2" />
    </header>

    <div class="gallery-grid">
      <section class="gallery-section span-all" aria-labelledby="actions-title">
        <div class="section-heading">
          <div>
            <p class="section-index">01 / ACTIONS</p>
            <h2 id="actions-title">Buttons & indicators</h2>
          </div>
          <span class="component-label">QBtn · QIcon · QBadge · QChip · QAvatar</span>
        </div>
        <div class="showcase-row">
          <q-btn color="primary" label="Primary action" unelevated />
          <q-btn outline color="primary" label="Outline" />
          <q-btn flat color="grey-8" label="Flat action" />
          <q-btn round color="teal-7" icon="sym_o_add" aria-label="Add item">
            <q-tooltip>Add item</q-tooltip>
          </q-btn>
          <q-btn-dropdown color="grey-9" label="More actions" dropdown-icon="sym_o_expand_more">
            <q-list>
              <q-item v-close-popup clickable @click="notify('Edit selected')">
                <q-item-section avatar><q-icon name="sym_o_edit" /></q-item-section>
                <q-item-section>Edit</q-item-section>
              </q-item>
              <q-item v-close-popup clickable @click="notify('Export started')">
                <q-item-section avatar><q-icon name="sym_o_download" /></q-item-section>
                <q-item-section>Export</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
          <q-fab color="teal-7" icon="sym_o_add" direction="up" label="Quick add">
            <q-fab-action color="teal-5" icon="sym_o_note_add" label="Note" />
            <q-fab-action color="blue-7" icon="sym_o_upload_file" label="File" />
          </q-fab>
        </div>
        <q-separator class="section-rule" />
        <div class="showcase-row indicators-row">
          <q-icon name="sym_o_precision_manufacturing" size="24px" color="teal-8" />
          <q-badge color="positive" label="Online" />
          <q-badge color="negative" label="Attention" />
          <q-chip color="teal-1" text-color="teal-10" icon="sym_o_filter_alt">ETCH</q-chip>
          <q-chip removable color="grey-2" text-color="grey-9">Removable filter</q-chip>
          <q-avatar color="blue-grey-9" text-color="white" size="32px">AT</q-avatar>
          <q-avatar color="orange-2" text-color="orange-10" icon="sym_o_person" size="32px" />
        </div>
      </section>

      <section class="gallery-section" aria-labelledby="forms-title">
        <div class="section-heading">
          <div>
            <p class="section-index">02 / INPUT</p>
            <h2 id="forms-title">Form controls</h2>
          </div>
          <span class="component-label">QInput · QSelect · QFile</span>
        </div>
        <div class="control-stack">
          <q-input v-model="search" filled label="Search machines" stack-label>
            <template #append><q-icon name="sym_o_search" /></template>
          </q-input>
          <q-select
            v-model="selectedMachine"
            :options="machineOptions"
            outlined
            dense
            label="Machine"
            options-dense
          />
          <q-input v-model="search" outlined dense label="Disabled field" disable />
          <q-file v-model="uploadedFile" outlined dense label="Attach a file" clearable>
            <template #prepend><q-icon name="sym_o_attach_file" /></template>
          </q-file>
        </div>
      </section>

      <section class="gallery-section" aria-labelledby="selection-title">
        <div class="section-heading">
          <div>
            <p class="section-index">03 / SELECTION</p>
            <h2 id="selection-title">Selection & range</h2>
          </div>
          <span class="component-label">QCheckbox · QToggle · QOptionGroup · QSlider</span>
        </div>
        <div class="selection-grid">
          <q-checkbox v-model="powerEnabled" label="Machine enabled" color="teal-7" />
          <q-toggle v-model="notificationsEnabled" label="Notifications" color="teal-7" />
          <q-option-group v-model="selectedMode" :options="modeOptions" color="teal-7" inline />
        </div>
        <div class="range-control">
          <div class="range-title">
            <span>Threshold</span><strong>{{ threshold }}%</strong>
          </div>
          <q-slider v-model="threshold" :min="0" :max="100" color="teal-7" label label-always />
          <div class="range-title">
            <span>Operating window</span><strong>{{ range.min }}–{{ range.max }}%</strong>
          </div>
          <q-range v-model="range" :min="0" :max="100" :step="5" color="blue-7" />
        </div>
        <div class="showcase-row">
          <q-rating v-model="rating" size="24px" color="orange-7" icon="sym_o_star" />
          <span class="muted-copy">Rating: {{ rating }} / 5</span>
        </div>
      </section>

      <section class="gallery-section" aria-labelledby="navigation-title">
        <div class="section-heading">
          <div>
            <p class="section-index">04 / NAVIGATION</p>
            <h2 id="navigation-title">Navigation patterns</h2>
          </div>
          <span class="component-label">QTabs · QList · QExpansionItem</span>
        </div>
        <q-tabs
          v-model="activeTab"
          dense
          align="left"
          active-color="teal-8"
          indicator-color="teal-7"
        >
          <q-tab name="overview" label="Overview" icon="sym_o_dashboard" />
          <q-tab name="activity" label="Activity" icon="sym_o_history" />
          <q-tab name="settings" label="Settings" icon="sym_o_tune" />
        </q-tabs>
        <q-separator />
        <q-tab-panels v-model="activeTab" animated class="tab-panels">
          <q-tab-panel name="overview">Overview panel content</q-tab-panel>
          <q-tab-panel name="activity">Recent activity panel content</q-tab-panel>
          <q-tab-panel name="settings">Settings panel content</q-tab-panel>
        </q-tab-panels>
        <q-list bordered separator class="demo-list">
          <q-item clickable v-ripple>
            <q-item-section avatar><q-icon name="sym_o_sensors" color="teal-8" /></q-item-section>
            <q-item-section>
              <q-item-label>ETCH-01</q-item-label>
              <q-item-label caption>Processing · Bay 2</q-item-label>
            </q-item-section>
            <q-item-section side><q-badge color="positive" label="Ready" /></q-item-section>
          </q-item>
          <q-expansion-item
            icon="sym_o_more_horiz"
            label="Expandable list item"
            caption="Show details"
          >
            <q-card
              ><q-card-section class="muted-copy"
                >Additional item details go here.</q-card-section
              ></q-card
            >
          </q-expansion-item>
        </q-list>
        <q-breadcrumbs class="breadcrumbs">
          <q-breadcrumbs-el label="Home" icon="home" />
          <q-breadcrumbs-el label="Equipment" />
          <q-breadcrumbs-el label="ETCH-01" />
        </q-breadcrumbs>
      </section>

      <section class="gallery-section" aria-labelledby="feedback-title">
        <div class="section-heading">
          <div>
            <p class="section-index">05 / FEEDBACK</p>
            <h2 id="feedback-title">Feedback & overlays</h2>
          </div>
          <span class="component-label">QBanner · QProgress · QDialog · QTooltip</span>
        </div>
        <q-banner rounded class="bg-amber-1 text-grey-9">
          <template #avatar><q-icon name="sym_o_warning" color="orange-9" /></template>
          Calibration is due for ETCH-01.
          <template #action>
            <q-btn flat color="orange-10" label="Review" @click="dialogOpen = true" />
          </template>
        </q-banner>
        <div class="progress-grid">
          <div>
            <div class="range-title"><span>Process completion</span><strong>72%</strong></div>
            <q-linear-progress
              :value="0.72"
              color="teal-7"
              track-color="grey-3"
              size="8px"
              rounded
            />
          </div>
          <q-circular-progress
            show-value
            font-size="12px"
            :value="72"
            size="64px"
            :thickness="0.16"
            color="teal-7"
            track-color="grey-3"
          >
            72%
          </q-circular-progress>
          <q-spinner-dots color="teal-7" size="32px" />
        </div>
        <div class="skeleton-stack">
          <q-skeleton type="text" width="38%" />
          <q-skeleton type="rect" height="36px" />
        </div>
        <div class="showcase-row">
          <q-btn color="teal-8" outline label="Open dialog" @click="dialogOpen = true" />
          <q-btn
            color="grey-9"
            flat
            label="Show notification"
            @click="notify('Saved successfully')"
          />
        </div>
        <q-dialog v-model="dialogOpen">
          <q-card class="dialog-card">
            <q-card-section class="row items-center q-pb-none">
              <div class="text-h6">Calibration reminder</div>
              <q-space />
              <q-btn v-close-popup icon="sym_o_close" flat round dense aria-label="Close dialog" />
            </q-card-section>
            <q-card-section
              >Schedule calibration for ETCH-01 before the next production run.</q-card-section
            >
            <q-card-actions align="right">
              <q-btn v-close-popup flat label="Dismiss" />
              <q-btn v-close-popup color="teal-8" label="Acknowledge" unelevated />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </section>

      <section class="gallery-section" aria-labelledby="data-title">
        <div class="section-heading">
          <div>
            <p class="section-index">06 / DATA</p>
            <h2 id="data-title">Tables & pagination</h2>
          </div>
          <span class="component-label">QTable · QMarkupTable · QPagination</span>
        </div>
        <q-table
          flat
          bordered
          dense
          :rows="machineRows"
          :columns="tableColumns"
          row-key="machine"
          hide-bottom
          class="machine-table"
        />
        <div class="pagination-row">
          <span class="muted-copy">Showing 1–3 of 15 machines</span>
          <q-pagination v-model="page" :max="5" direction-links color="teal-8" boundary-numbers />
        </div>
        <q-markup-table flat dense separator="horizontal" class="markup-table">
          <thead>
            <tr>
              <th class="text-left">Metric</th>
              <th class="text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Active lots</td>
              <td class="text-right">12</td>
            </tr>
            <tr>
              <td>Queue time</td>
              <td class="text-right">08:42</td>
            </tr>
          </tbody>
        </q-markup-table>
      </section>

      <section class="gallery-section" aria-labelledby="date-title">
        <div class="section-heading">
          <div>
            <p class="section-index">07 / DATE & TIME</p>
            <h2 id="date-title">Date and time pickers</h2>
          </div>
          <span class="component-label">QDate · QTime · QPopupProxy</span>
        </div>
        <div class="date-time-grid">
          <div>
            <p class="control-caption">Selected date: {{ selectedDate }}</p>
            <q-date v-model="selectedDate" minimal color="teal-8" />
          </div>
          <div>
            <p class="control-caption">Selected time: {{ selectedTime }}</p>
            <q-time v-model="selectedTime" format24h color="teal-8" />
          </div>
        </div>
      </section>

      <section class="gallery-section span-all" aria-labelledby="editor-title">
        <div class="section-heading">
          <div>
            <p class="section-index">08 / CONTENT</p>
            <h2 id="editor-title">Rich text & carousel</h2>
          </div>
          <span class="component-label">QEditor · QCarousel · QSeparator</span>
        </div>
        <div class="content-demo-grid">
          <q-editor v-model="editorContent" min-height="120px" />
          <q-carousel
            v-model="slide"
            animated
            arrows
            navigation
            height="160px"
            class="demo-carousel"
          >
            <q-carousel-slide name="first" class="carousel-slide">
              <q-icon name="sym_o_precision_manufacturing" size="28px" />
              <span>Machine overview</span>
            </q-carousel-slide>
            <q-carousel-slide name="second" class="carousel-slide">
              <q-icon name="sym_o_monitoring" size="28px" />
              <span>Process monitoring</span>
            </q-carousel-slide>
            <q-carousel-slide name="third" class="carousel-slide">
              <q-icon name="sym_o_assignment" size="28px" />
              <span>Maintenance log</span>
            </q-carousel-slide>
          </q-carousel>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { ref } from 'vue';

const $q = useQuasar();

const search = ref('');
const selectedMachine = ref('ETCH-01');
const machineOptions = ['ETCH-01', 'ETCH-02', 'CVD-01', 'IMP-03'];
const uploadedFile = ref<File | null>(null);
const powerEnabled = ref(true);
const notificationsEnabled = ref(false);
const selectedMode = ref('auto');
const modeOptions = [
  { label: 'Auto', value: 'auto' },
  { label: 'Manual', value: 'manual' },
];
const threshold = ref(68);
const range = ref({ min: 25, max: 75 });
const rating = ref(4);
const activeTab = ref('overview');
const dialogOpen = ref(false);
const page = ref(1);
const selectedDate = ref('2026/10/07');
const selectedTime = ref('14:30');
const editorContent = ref('<p>Maintenance note for <strong>ETCH-01</strong></p>');
const slide = ref('first');

const tableColumns = [
  { name: 'machine', label: 'Machine', field: 'machine', align: 'left' as const, sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'left' as const },
  { name: 'bay', label: 'Bay', field: 'bay', align: 'right' as const },
];

const machineRows = [
  { machine: 'ETCH-01', status: 'Processing', bay: '02' },
  { machine: 'ETCH-02', status: 'Ready', bay: '02' },
  { machine: 'CVD-01', status: 'Maintenance', bay: '04' },
];

function notify(message: string) {
  $q.notify({ message, color: 'teal-8', icon: 'sym_o_check_circle', timeout: 1800 });
}
</script>

<style scoped>
.index-page {
  --gallery-ink: #172d31;
  --gallery-muted: #667579;
  --gallery-line: #dce5e3;
  --gallery-accent: #117d73;
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 40px clamp(20px, 4vw, 64px) 72px;
  color: var(--gallery-ink);
}

.page-heading,
.section-heading,
.showcase-row,
.range-title,
.pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-heading {
  margin-bottom: 32px;
  padding-bottom: 26px;
  border-bottom: 1px solid var(--gallery-line);
}

.eyebrow,
.section-index,
.component-label,
.control-caption {
  margin: 0;
  color: var(--gallery-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 8px;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.15;
}

.page-intro {
  margin-bottom: 0;
  color: var(--gallery-muted);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.gallery-section {
  min-width: 0;
  padding: 24px;
  border: 1px solid var(--gallery-line);
  border-radius: 6px;
  background: #fff;
}

.span-all {
  grid-column: 1 / -1;
}

.section-heading {
  gap: 16px;
  margin-bottom: 20px;
}

.section-heading h2 {
  margin: 4px 0 0;
  font-size: 18px;
  line-height: 1.3;
}

.component-label {
  text-align: right;
  letter-spacing: 0.02em;
  text-transform: none;
}

.showcase-row {
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

.section-rule {
  margin: 18px 0;
}

.indicators-row {
  min-height: 34px;
}

.control-stack,
.range-control,
.skeleton-stack {
  display: grid;
  gap: 16px;
}

.selection-grid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 18px;
}

.range-control {
  margin: 20px 0;
}

.range-title {
  color: var(--gallery-muted);
  font-size: 13px;
}

.range-title strong {
  color: var(--gallery-ink);
  font-weight: 600;
}

.muted-copy {
  color: var(--gallery-muted);
  font-size: 13px;
}

.tab-panels {
  min-height: 64px;
  color: var(--gallery-muted);
}

.demo-list {
  border-radius: 4px;
}

.breadcrumbs {
  margin-top: 18px;
  color: var(--gallery-muted);
}

.progress-grid {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) auto auto;
  align-items: center;
  gap: 24px;
  margin: 20px 4px;
}

.progress-grid > div:first-child {
  display: grid;
  gap: 12px;
}

.skeleton-stack {
  margin-bottom: 20px;
}

.dialog-card {
  width: min(420px, calc(100vw - 32px));
}

.machine-table {
  border-radius: 4px;
}

.pagination-row {
  flex-wrap: wrap;
  gap: 12px;
  margin: 14px 0;
}

.markup-table {
  border: 1px solid var(--gallery-line);
  border-radius: 4px;
}

.date-time-grid,
.content-demo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.control-caption {
  margin-bottom: 10px;
  letter-spacing: 0.02em;
  text-transform: none;
}

.date-time-grid :deep(.q-date),
.date-time-grid :deep(.q-time) {
  max-width: 100%;
  margin: 0 auto;
}

.demo-carousel {
  border: 1px solid var(--gallery-line);
  border-radius: 4px;
  color: var(--gallery-ink);
  background: #edf4f2;
}

.carousel-slide {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: var(--gallery-accent);
  font-weight: 600;
}

@media (max-width: 760px) {
  .index-page {
    padding: 24px 16px 48px;
  }

  .gallery-grid,
  .date-time-grid,
  .content-demo-grid {
    grid-template-columns: 1fr;
  }

  .gallery-section {
    padding: 18px;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .component-label {
    text-align: left;
  }

  .progress-grid {
    grid-template-columns: 1fr auto;
  }

  .progress-grid > div:first-child {
    grid-column: 1 / -1;
  }
}
</style>
