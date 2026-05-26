<template>
  <div class="grid-wrapper">
    <div v-if="store.allFilteredTables.length === 0" class="empty-state">
      Нет столов для отображения
    </div>

    <div v-else class="grid" :style="gridStyle">
      <div class="corner"></div>

      <div
        v-for="(table, idx) in store.allFilteredTables"
        :key="'hdr-' + table.id"
        class="col-header"
        :class="{ 'col-header--selected': isColSelected(idx) }"
      >
        <div class="col-num">#{{ table.number }}</div>
        <div class="col-cap">{{ table.capacity }} чел.</div>
        <div class="col-zone">{{ table.zone }}</div>
      </div>

      <div class="time-axis" :style="{ height: totalHeight + 'px' }">
        <div
          v-for="slot in timeSlots"
          :key="slot.minutes"
          class="time-label"
          :class="{ 'is-hour': slot.isHour }"
          :style="{ top: timeOffset(slot.minutes) + 'px' }"
        >
          {{ slot.label }}
        </div>
      </div>

      <div
        v-for="(table, idx) in store.allFilteredTables"
        :key="'col-' + table.id"
        class="events-col"
        :style="{ height: totalHeight + 'px' }"
        @mousedown="onColMouseDown($event, idx)"
        @mousemove="onColMouseMove($event, idx)"
      >
        <div class="h-grid" :style="gridLinesStyle" />

        <div
          v-if="showTimeLine"
          class="now-line"
          :style="{ top: nowOffset + 'px' }"
        />

        <div
          v-if="isColSelected(idx)"
          class="selection-overlay"
          :style="selectionStyle(idx)"
        />

        <EventBlock
          v-for="ev in store.getEventsForTable(table.id)"
          :key="ev.id"
          :event="ev"
          :px-per-min="PX_PER_MIN"
          :opening-minutes="store.openingMinutes"
          :timezone="store.restaurant?.timezone ?? ''"
          :col-width="COL_WIDTH"
          :max-lanes="store.getRowLevels(table.id)"
        />
      </div>
    </div>

    <div v-if="hasDragPreview" class="drag-preview" :style="dragPreviewStyle">
      <div class="dp-title">Новое бронирование</div>
      <div class="dp-date">{{ selectedDateLabel }}</div>
      <div class="dp-time">{{ dragStartLabel }} – {{ dragEndLabel }}</div>
      <div class="dp-duration">{{ dragDurationLabel }}</div>
      <div class="dp-tables">
        Столы&nbsp;<template v-for="(t, i) in dragTables" :key="t.id"
          ><strong>#{{ t.number }}</strong
          ><span v-if="i < dragTables.length - 1"> + </span></template
        >
      </div>
      <div class="dp-capacity">
        На&nbsp;<strong>{{ dragTotalCapacity }} чел</strong>
      </div>
    </div>

    <Transition name="panel">
      <div
        v-if="selection"
        class="booking-panel"
        :style="panelStyle"
        @mousedown.stop
      >
        <div class="bp-title">Новое бронирование</div>
        <div class="bp-date">{{ selectedDateLabel }}</div>
        <div class="bp-time">{{ selStartLabel }} – {{ selEndLabel }}</div>
        <div class="bp-duration">{{ selDurationLabel }}</div>
        <div class="bp-spacer"></div>
        <div class="bp-tables">
          Столы&nbsp;<template v-for="(t, i) in selectedTables" :key="t.id"
            ><strong>#{{ t.number }}</strong
            ><span v-if="i < selectedTables.length - 1"> + </span></template
          >
        </div>
        <div class="bp-capacity">
          На&nbsp;<strong>{{ selTotalCapacity }} чел</strong>
        </div>
        <div class="bp-actions">
          <button class="bp-btn bp-btn--create" @click="createBooking">
            Создать
          </button>
          <button class="bp-btn bp-btn--cancel" @click="clearSelection">
            Отменить
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useBookingStore } from "../stores/bookingStore";
import { useRestaurantTime } from "../composables/useRestaurantTime";
import { generateTimeSlots, minutesToTime } from "../utils/timeUtils";
import EventBlock from "./EventBlock.vue";

const PX_PER_MIN = 2;
const COL_WIDTH = 120;
const TIME_AXIS_WIDTH = 60;
const HEADER_HEIGHT = 60;
const MIN_DRAG_MINUTES = 15;

const store = useBookingStore();
const { currentMinutes } = useRestaurantTime(
  () => store.restaurant?.timezone ?? ""
);

const timeSlots = computed(() =>
  generateTimeSlots(store.openingMinutes, store.closingMinutes)
);
const totalHeight = computed(
  () => (store.closingMinutes - store.openingMinutes) * PX_PER_MIN
);
const numTables = computed(() => store.allFilteredTables.length);

const gridStyle = computed(() => ({
  display: "grid",
  gridTemplateColumns: `${TIME_AXIS_WIDTH}px repeat(${numTables.value}, ${COL_WIDTH}px)`,
  gridTemplateRows: `${HEADER_HEIGHT}px ${totalHeight.value}px`,
  minWidth: `${TIME_AXIS_WIDTH + numTables.value * COL_WIDTH}px`,
}));

function timeOffset(minutes: number): number {
  return (minutes - store.openingMinutes) * PX_PER_MIN;
}

const nowOffset = computed(
  () => (currentMinutes.value - store.openingMinutes) * PX_PER_MIN
);
const showTimeLine = computed(
  () =>
    currentMinutes.value >= store.openingMinutes &&
    currentMinutes.value <= store.closingMinutes
);

const slotPx = 30 * PX_PER_MIN;
const hourPx = 60 * PX_PER_MIN;

const gridLinesStyle = {
  backgroundImage: `
    repeating-linear-gradient(
      to bottom,
      var(--grid-line-hour) 0, var(--grid-line-hour) 1px,
      transparent 1px, transparent ${hourPx}px
    ),
    repeating-linear-gradient(
      to bottom,
      var(--grid-line-slot) 0, var(--grid-line-slot) 1px,
      transparent 1px, transparent ${slotPx}px
    )
  `,
};

interface SelectionState {
  startIdx: number;
  endIdx: number;
  startMin: number;
  endMin: number;
}

const dragging = ref<{
  startIdx: number;
  currentIdx: number;
  startMin: number;
  currentMin: number;
} | null>(null);

const selection = ref<SelectionState | null>(null);

const hasSelection = computed(() => selection.value !== null);

function yToRelMin(y: number): number {
  const raw = y / PX_PER_MIN;
  const snapped = Math.round(raw / 15) * 15;
  return Math.max(
    0,
    Math.min(snapped, store.closingMinutes - store.openingMinutes)
  );
}

function onColMouseDown(e: MouseEvent, idx: number) {
  if ((e.target as HTMLElement).closest(".event-card")) return;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const relMin = yToRelMin(e.clientY - rect.top);
  dragging.value = {
    startIdx: idx,
    currentIdx: idx,
    startMin: relMin,
    currentMin: relMin,
  };
  selection.value = null;
  e.preventDefault();
}

function onColMouseMove(e: MouseEvent, idx: number) {
  if (!dragging.value) return;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  dragging.value.currentMin = yToRelMin(e.clientY - rect.top);
  dragging.value.currentIdx = idx;
}

function onDocMouseUp() {
  if (!dragging.value) return;
  const { startIdx, currentIdx, startMin, currentMin } = dragging.value;
  const start = Math.min(startMin, currentMin);
  const end = Math.max(startMin, currentMin);
  if (end - start >= MIN_DRAG_MINUTES) {
    selection.value = {
      startIdx: Math.min(startIdx, currentIdx),
      endIdx: Math.max(startIdx, currentIdx),
      startMin: start,
      endMin: end,
    };
  }
  dragging.value = null;
}

function isColSelected(idx: number): boolean {
  if (selection.value) {
    return idx >= selection.value.startIdx && idx <= selection.value.endIdx;
  }
  if (dragging.value) {
    const lo = Math.min(dragging.value.startIdx, dragging.value.currentIdx);
    const hi = Math.max(dragging.value.startIdx, dragging.value.currentIdx);
    return idx >= lo && idx <= hi;
  }
  return false;
}

function selectionStyle(idx: number): Record<string, string> {
  const d = dragging.value;
  const s = selection.value;

  let startMin = 0,
    endMin = 0;

  if (d && isColSelected(idx)) {
    startMin = Math.min(d.startMin, d.currentMin);
    endMin = Math.max(d.startMin, d.currentMin);
  } else if (s && isColSelected(idx)) {
    startMin = s.startMin;
    endMin = s.endMin;
  } else {
    return {};
  }

  return {
    top: `${startMin * PX_PER_MIN}px`,
    height: `${Math.max((endMin - startMin) * PX_PER_MIN, 4)}px`,
  };
}

const hasDragPreview = computed(() => {
  if (!dragging.value) return false;
  return (
    Math.abs(dragging.value.currentMin - dragging.value.startMin) >=
    MIN_DRAG_MINUTES
  );
});

const PREVIEW_WIDTH = 188;

const dragPreviewStyle = computed(() => {
  if (!dragging.value) return {};
  const lo = Math.min(dragging.value.startIdx, dragging.value.currentIdx);
  const hi = Math.max(dragging.value.startIdx, dragging.value.currentIdx);
  const startMin = Math.min(dragging.value.startMin, dragging.value.currentMin);
  const rightEdge = TIME_AXIS_WIDTH + (hi + 1) * COL_WIDTH + 8;
  return {
    position: "absolute" as const,
    left: `${rightEdge}px`,
    top: `${HEADER_HEIGHT + startMin * PX_PER_MIN}px`,
    width: `${PREVIEW_WIDTH}px`,
    zIndex: "55",
    pointerEvents: "none" as const,
  };
});

const dragStartLabel = computed(() => {
  if (!dragging.value) return "";
  return minutesToTime(
    Math.min(dragging.value.startMin, dragging.value.currentMin) +
      store.openingMinutes
  );
});
const dragEndLabel = computed(() => {
  if (!dragging.value) return "";
  return minutesToTime(
    Math.max(dragging.value.startMin, dragging.value.currentMin) +
      store.openingMinutes
  );
});
const dragDurationLabel = computed(() => {
  if (!dragging.value) return "";
  const mins = Math.abs(dragging.value.currentMin - dragging.value.startMin);
  if (mins < MIN_DRAG_MINUTES) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hLabel =
    h > 0 ? `${h} ${h === 1 ? "час" : h < 5 ? "часа" : "часов"}` : "";
  const mLabel = m > 0 ? `${m} мин` : "";
  return [hLabel, mLabel].filter(Boolean).join(" ");
});
const dragTables = computed(() => {
  if (!dragging.value) return [];
  const lo = Math.min(dragging.value.startIdx, dragging.value.currentIdx);
  const hi = Math.max(dragging.value.startIdx, dragging.value.currentIdx);
  return store.allFilteredTables.slice(lo, hi + 1);
});
const dragTotalCapacity = computed(() =>
  dragTables.value.reduce((sum, t) => sum + t.capacity, 0)
);

const panelStyle = computed(() => {
  if (!selection.value) return {};
  const { startIdx, endIdx, startMin, endMin } = selection.value;
  const w = (endIdx - startIdx + 1) * COL_WIDTH;
  const h = (endMin - startMin) * PX_PER_MIN;
  const scale = Math.min(1, Math.max(0.4, Math.min(w, h) / 200));
  return {
    position: "absolute" as const,
    left: `${TIME_AXIS_WIDTH + startIdx * COL_WIDTH}px`,
    top: `${HEADER_HEIGHT + startMin * PX_PER_MIN}px`,
    width: `${w}px`,
    height: `${h}px`,
    zIndex: "50",
    "--bp-scale": String(scale),
  };
});

const selectedTables = computed(() => {
  if (!selection.value) return [];
  return store.allFilteredTables.slice(
    selection.value.startIdx,
    selection.value.endIdx + 1
  );
});

const selTotalCapacity = computed(() =>
  selectedTables.value.reduce((sum, t) => sum + t.capacity, 0)
);

const selDurationLabel = computed(() => {
  if (!selection.value) return "";
  const mins = selection.value.endMin - selection.value.startMin;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hLabel =
    h > 0 ? `${h} ${h === 1 ? "час" : h < 5 ? "часа" : "часов"}` : "";
  const mLabel = m > 0 ? `${m} мин` : "";
  return [hLabel, mLabel].filter(Boolean).join(" ");
});

const selStartLabel = computed(() =>
  selection.value
    ? minutesToTime(selection.value.startMin + store.openingMinutes)
    : ""
);
const selEndLabel = computed(() =>
  selection.value
    ? minutesToTime(selection.value.endMin + store.openingMinutes)
    : ""
);

const selectedDateLabel = computed(() => {
  const day = store.selectedDay;
  if (!day) return "";
  const [y, mo, d] = day.split("-").map(Number);
  const parts = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).formatToParts(new Date(y, mo - 1, d));
  return parts
    .filter(
      (p) => p.type === "day" || p.type === "month" || p.type === "literal"
    )
    .map((p) => p.value)
    .join("")
    .trim();
});

function onDocKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape") clearSelection();
}

onMounted(() => {
  document.addEventListener("mouseup", onDocMouseUp);
  document.addEventListener("keydown", onDocKeyDown);
});

onUnmounted(() => {
  document.removeEventListener("mouseup", onDocMouseUp);
  document.removeEventListener("keydown", onDocKeyDown);
});

function createBooking() {
  if (!selection.value) return;
  console.log({
    tables: selectedTables.value.map((t) => t.id),
    tableNums: selectedTables.value.map((t) => t.number),
    startTime: selStartLabel.value,
    endTime: selEndLabel.value,
  });
  clearSelection();
}

function clearSelection() {
  selection.value = null;
  dragging.value = null;
}

defineExpose({ hasSelection, createBooking, clearSelection });
</script>

<style scoped>
.grid-wrapper {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--bg-base);
  position: relative;
}

.grid {
}

.corner {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 40;
  grid-row: 1;
  grid-column: 1;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-strong);
  border-bottom: 2px solid var(--border-strong);
}

.col-header {
  position: sticky;
  top: 0;
  z-index: 30;
  grid-row: 1;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-faint);
  border-bottom: 2px solid var(--border-strong);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
  gap: 1px;
  transition: background 0.12s, border-bottom-color 0.12s;
}
.col-header--selected {
  background: rgba(99, 102, 241, 0.12);
  border-bottom-color: rgba(99, 102, 241, 0.7);
}
.col-num {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
}
.col-cap {
  font-size: 10px;
  color: var(--text-secondary);
}
.col-zone {
  font-size: 9px;
  color: var(--text-secondary);
  opacity: 0.7;
}

.time-axis {
  position: sticky;
  left: 0;
  z-index: 20;
  grid-row: 2;
  grid-column: 1;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-strong);
}
.time-label {
  position: absolute;
  right: 6px;
  font-size: 10px;
  color: var(--text-secondary);
  line-height: 1;
  transform: translateY(-50%);
  white-space: nowrap;
  user-select: none;
}
.time-label.is-hour {
  font-weight: 700;
  color: var(--text-primary);
}

.events-col {
  grid-row: 2;
  position: relative;
  border-right: 1px solid var(--border-faint);
  cursor: crosshair;
}
.h-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.selection-overlay {
  position: absolute;
  left: 0;
  right: 0;
  background: rgba(99, 102, 241, 0.15);
  pointer-events: none;
  z-index: 15;
}

.now-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: #ef4444;
  z-index: 10;
  pointer-events: none;
}
.now-line::before {
  content: "";
  position: absolute;
  left: -4px;
  top: -4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
}

.empty-state {
  padding: 60px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}
</style>

<style>
.booking-panel {
  padding: calc(var(--bp-scale, 1) * 12px) calc(var(--bp-scale, 1) * 13px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  pointer-events: none;
}
.booking-panel .bp-actions {
  pointer-events: all;
}

.bp-title {
  font-size: calc(var(--bp-scale, 1) * 13px);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: calc(var(--bp-scale, 1) * 3px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bp-date {
  font-size: calc(var(--bp-scale, 1) * 11px);
  color: var(--text-secondary);
  margin-bottom: calc(var(--bp-scale, 1) * 1px);
}
.bp-time {
  font-size: calc(var(--bp-scale, 1) * 20px);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  letter-spacing: -0.5px;
  white-space: nowrap;
}
.bp-duration {
  font-size: calc(var(--bp-scale, 1) * 11px);
  color: var(--text-secondary);
  margin-top: calc(var(--bp-scale, 1) * 1px);
}
.bp-spacer {
  flex: 1;
  min-height: 4px;
}
.bp-tables {
  font-size: calc(var(--bp-scale, 1) * 11px);
  color: var(--text-secondary);
  margin-bottom: calc(var(--bp-scale, 1) * 2px);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
}
.bp-tables strong {
  font-size: calc(var(--bp-scale, 1) * 12px);
  font-weight: 700;
  color: var(--text-primary);
}
.bp-capacity {
  font-size: calc(var(--bp-scale, 1) * 11px);
  color: var(--text-secondary);
  margin-bottom: calc(var(--bp-scale, 1) * 8px);
}
.bp-capacity strong {
  font-size: calc(var(--bp-scale, 1) * 12px);
  font-weight: 700;
  color: var(--text-primary);
}
.bp-actions {
  display: flex;
  flex-direction: column;
  gap: calc(var(--bp-scale, 1) * 5px);
}
.bp-btn {
  width: 100%;
  padding: calc(var(--bp-scale, 1) * 8px) 8px;
  border-radius: calc(var(--bp-scale, 1) * 8px);
  font-size: calc(var(--bp-scale, 1) * 12px);
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: filter 0.15s;
}
.bp-btn:hover {
  filter: brightness(0.93);
}
.bp-btn--create {
  background: #4f6af5;
  color: #fff;
}
.bp-btn--cancel {
  background: rgba(99, 102, 241, 0.15);
  color: var(--text-primary);
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.panel-enter-active {
  transition: opacity 0.12s;
}
.panel-leave-active {
  transition: opacity 0.08s;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}

.drag-preview {
  background: #fff;
  border: 1.5px solid rgba(99, 102, 241, 0.45);
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dp-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
.dp-date {
  font-size: 11px;
  color: #64748b;
}
.dp-time {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
  letter-spacing: -0.3px;
  margin: 2px 0;
}
.dp-duration {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 6px;
}
.dp-tables {
  font-size: 11px;
  color: #64748b;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
}
.dp-tables strong {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
.dp-capacity {
  font-size: 11px;
  color: #64748b;
}
.dp-capacity strong {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
</style>
