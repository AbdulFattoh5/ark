<template>
  <div class="date-selector">
    <span class="section-label">Дата</span>
    <div class="days-row">
      <button
        v-for="day in store.availableDays"
        :key="day"
        class="day-btn"
        :class="{ active: day === store.selectedDay }"
        @click="store.selectedDay = day"
      >
        <span class="day-date">{{ dayMonth(day) }}</span>
        <span class="day-sub">{{ dayLabel(day) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBookingStore } from "../stores/bookingStore";

const store = useBookingStore();

function dayMonth(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(new Date(y, mo - 1, d));
}

function dayLabel(dateStr: string): string {
  if (!store.data) return "";
  const days = store.data.available_days;
  const idx = days.indexOf(dateStr);
  const todayIdx = days.indexOf(store.data.current_day);
  if (idx === todayIdx) return "сегодня";
  if (idx === todayIdx + 1) return "завтра";
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(
    new Date(y, mo - 1, d)
  );
}
</script>

<style scoped>
.date-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.section-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}
.days-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.day-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  cursor: pointer;
  transition: all 0.15s;
  color: var(--text-primary);
  min-width: 110px;
  gap: 1px;
}
.day-btn:hover {
  background: var(--hover-bg);
  border-color: var(--accent);
}
.day-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.day-date {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
}
.day-sub {
  font-size: 11px;
  opacity: 0.7;
  line-height: 1.2;
}
</style>
