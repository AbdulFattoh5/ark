<template>
  <div
    ref="blockEl"
    class="event-card"
    :class="[cardClass, { 'is-narrow': isNarrow }]"
    :style="cardStyle"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
  >
    <template v-if="event.type === 'order'">
      <div class="c-type">Заказ</div>
      <div class="c-status-text">{{ orderStatusLabel }}</div>
      <div v-if="showTime" class="c-time">{{ startLabel }}–{{ endLabel }}</div>
    </template>

    <template v-else>
      <div class="c-id">№{{ event.id }}</div>
      <div class="c-name">
        {{ event.label }}{{ event.numPeople ? `; ${event.numPeople}чел` : "" }}
      </div>
      <div v-if="showBadge" class="c-badge" :class="badgeClass">
        {{ badgeLabel }}
      </div>
      <div v-if="showPhone && event.phone" class="c-phone">
        {{ shortPhone }}
      </div>
      <div v-if="showTime" class="c-time">{{ startLabel }}–{{ endLabel }}</div>
    </template>

    <Teleport to="body">
      <Transition name="tooltip">
        <div v-if="hovered" class="event-tooltip" :style="tooltipStyle">
          <div class="tt-row">
            <span class="tt-badge" :class="cardClass">{{
              fullStatusLabel
            }}</span>
          </div>
          <div v-if="event.type === 'reservation'" class="tt-row">
            <span class="tt-icon">👤</span>
            <span>{{ event.label }}</span>
            <span v-if="event.numPeople" class="tt-muted"
              >{{ event.numPeople }} чел.</span
            >
          </div>
          <div v-if="event.phone" class="tt-row">
            <span class="tt-icon">📞</span>
            <span>{{ event.phone }}</span>
          </div>
          <div class="tt-row tt-time">
            <span class="tt-icon">🕐</span>
            <span>{{ startLabel }} — {{ endLabel }}</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import type { GridEvent } from "../types/booking";
import { minutesToTime, isoToMinutesInTz } from "../utils/timeUtils";

const props = defineProps<{
  event: GridEvent;
  pxPerMin: number;
  openingMinutes: number;
  timezone: string;
  colWidth: number;
  maxLanes: number;
}>();

const blockEl = ref<HTMLElement>();
const hovered = ref(false);
const tooltipPos = ref({ top: 0, left: 0 });

const laneWidth = computed(() => props.colWidth / Math.max(props.maxLanes, 1));

const cardStyle = computed(() => ({
  position: "absolute" as const,
  top: `${props.event.startMinutes * props.pxPerMin}px`,
  height: `${Math.max(props.event.durationMinutes * props.pxPerMin - 2, 18)}px`,
  left: `${props.event.level * laneWidth.value + 2}px`,
  width: `${laneWidth.value - 4}px`,
}));

const cardHeight = computed(() => props.event.durationMinutes * props.pxPerMin);
const showBadge = computed(() => cardHeight.value >= 52);
const showPhone = computed(() => cardHeight.value >= 72);
const showTime = computed(() => cardHeight.value >= 36);

const NARROW_THRESHOLD = 28;
const isNarrow = computed(() => laneWidth.value < NARROW_THRESHOLD);

const cardClass = computed(() => {
  if (props.event.type === "order") {
    return `ev-order-${props.event.status.toLowerCase()}`;
  }
  const map: Record<string, string> = {
    "Живая очередь": "ev-res-queue",
    Новая: "ev-res-new",
    Заявка: "ev-res-app",
    Открыт: "ev-res-open",
    Закрыт: "ev-res-closed",
    "Занял место": "ev-res-seated",
    Вызвана: "ev-res-called",
    Отменен: "ev-res-cancelled",
  };
  return map[props.event.status] ?? "ev-res-new";
});

const ORDER_LABELS: Record<string, string> = {
  New: "Новый",
  Bill: "Пречек",
  Closed: "Закрытый",
  Banquet: "Банкет",
};
const orderStatusLabel = computed(
  () => ORDER_LABELS[props.event.status] ?? props.event.status
);

const BADGE_LABELS: Record<string, string> = {
  "ev-res-queue": "Живая очередь",
  "ev-res-new": "Ожидает подтв.",
  "ev-res-app": "Ожидаем",
  "ev-res-open": "В зале",
  "ev-res-closed": "Закрыт",
  "ev-res-seated": "В зале",
  "ev-res-called": "Вызвана",
  "ev-res-cancelled": "Отменен",
};
const badgeLabel = computed(
  () => BADGE_LABELS[cardClass.value] ?? props.event.status
);

const badgeClass = computed(() => {
  const key = cardClass.value.replace("ev-res-", "").replace("ev-order-", "");
  return `badge-${key}`;
});

const FULL_LABELS: Record<string, string> = {
  "ev-order-new": "Заказ / Новый",
  "ev-order-bill": "Заказ / Пречек",
  "ev-order-closed": "Заказ / Закрытый",
  "ev-order-banquet": "Банкет",
  "ev-res-queue": "Живая очередь",
  "ev-res-new": "Новая бронь",
  "ev-res-app": "Подтверждённая бронь",
  "ev-res-open": "Гости в зале",
  "ev-res-closed": "Бронь закрыта",
  "ev-res-seated": "Занял место",
  "ev-res-called": "Вызвана",
  "ev-res-cancelled": "Отменено",
};
const fullStatusLabel = computed(
  () => FULL_LABELS[cardClass.value] ?? props.event.status
);

const shortPhone = computed(() => {
  const p = props.event.phone ?? "";
  return p.length > 4 ? `…${p.slice(-4)}` : p;
});

const startLabel = computed(() =>
  minutesToTime(isoToMinutesInTz(props.event.rawStart, props.timezone))
);
const endLabel = computed(() =>
  minutesToTime(isoToMinutesInTz(props.event.rawEnd, props.timezone))
);

const tooltipStyle = computed(() => ({
  position: "fixed" as const,
  top: `${tooltipPos.value.top}px`,
  left: `${tooltipPos.value.left}px`,
  zIndex: "9999",
}));

function showTooltip() {
  hovered.value = true;
  nextTick(() => positionTooltip());
}
function hideTooltip() {
  hovered.value = false;
}

function positionTooltip() {
  if (!blockEl.value) return;
  const rect = blockEl.value.getBoundingClientRect();
  const TW = 240,
    TH = 120;
  const left = Math.min(rect.right + 8, window.innerWidth - TW - 8);
  const top = Math.min(rect.top, window.innerHeight - TH - 8);
  tooltipPos.value = { top, left };
}
</script>

<style scoped>
.event-card {
  position: absolute;
  border-radius: 4px;
  cursor: pointer;
  overflow: hidden;
  transition: filter 0.1s, box-shadow 0.1s;
  z-index: 2;
  user-select: none;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.event-card:hover {
  filter: brightness(1.15);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
  z-index: 20;
}

.c-type {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.2;
}
.c-status-text {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  line-height: 1.2;
}
.c-id {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.1;
}
.c-name {
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.c-phone {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.1;
}
.c-time {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.1;
  margin-top: auto;
}

.c-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 3px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.event-card.is-narrow .c-type,
.event-card.is-narrow .c-status-text,
.event-card.is-narrow .c-id,
.event-card.is-narrow .c-name,
.event-card.is-narrow .c-badge,
.event-card.is-narrow .c-phone,
.event-card.is-narrow .c-time {
  display: none;
}

.ev-order-new {
  background: #0e2828;
  border-left: 3px solid #2dd4bf;
}
.ev-order-bill {
  background: #201a08;
  border-left: 3px solid #f59e0b;
}
.ev-order-closed {
  background: #181c22;
  border-left: 3px solid #4b5563;
}
.ev-order-banquet {
  background: #1a0d2e;
  border-left: 3px solid #8b5cf6;
}

.ev-res-queue {
  background: #0d1f30;
  border-left: 3px solid #0ea5e9;
}
.ev-res-new {
  background: #241408;
  border-left: 3px solid #f97316;
}
.ev-res-app {
  background: #221808;
  border-left: 3px solid #f59e0b;
}
.ev-res-open {
  background: #0d2218;
  border-left: 3px solid #10b981;
}
.ev-res-closed {
  background: #181c22;
  border-left: 3px solid #4b5563;
}
.ev-res-seated {
  background: #0d2220;
  border-left: 3px solid #14b8a6;
}
.ev-res-called {
  background: #18102e;
  border-left: 3px solid #a78bfa;
}
.ev-res-cancelled {
  background: #200e0e;
  border-left: 3px solid #ef4444;
  opacity: 0.75;
}

.badge-queue {
  background: rgba(14, 165, 233, 0.25);
  color: #38bdf8;
}
.badge-new {
  background: rgba(249, 115, 22, 0.25);
  color: #fb923c;
}
.badge-app {
  background: rgba(245, 158, 11, 0.25);
  color: #fcd34d;
}
.badge-open {
  background: rgba(16, 185, 129, 0.25);
  color: #34d399;
}
.badge-closed {
  background: rgba(75, 85, 99, 0.25);
  color: #9ca3af;
}
.badge-seated {
  background: rgba(20, 184, 166, 0.25);
  color: #2dd4bf;
}
.badge-called {
  background: rgba(167, 139, 250, 0.25);
  color: #c4b5fd;
}
.badge-cancelled {
  background: rgba(239, 68, 68, 0.25);
  color: #f87171;
}
.badge-banquet {
  background: rgba(139, 92, 246, 0.25);
  color: #c4b5fd;
}
</style>

<style>
.event-tooltip {
  min-width: 200px;
  max-width: 260px;
  background: var(--tooltip-bg, #1e2535);
  border: 1px solid var(--tooltip-border, rgba(255, 255, 255, 0.15));
  border-radius: 8px;
  padding: 10px 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}
.tt-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-primary, #e2e8f0);
  margin-bottom: 4px;
}
.tt-row:last-child {
  margin-bottom: 0;
}
.tt-muted {
  color: var(--text-secondary, #8892a4);
}
.tt-time {
  color: var(--text-secondary, #8892a4);
  font-size: 11px;
}
.tt-icon {
  font-size: 12px;
  flex-shrink: 0;
}
.tt-badge {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  padding: 2px 7px;
  border-radius: 4px;
}
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s, transform 0.1s;
}
.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}
</style>
