<template>
  <div class="zone-filter">
    <span class="section-label">Отображаемые зоны</span>
    <div class="zones-row">
      <label
        v-for="zone in store.allZones"
        :key="zone"
        class="zone-chip"
        :class="{ active: store.activeZones.has(zone) }"
      >
        <input
          type="checkbox"
          :checked="store.activeZones.has(zone)"
          @change="store.toggleZone(zone)"
        />
        {{ zone }}
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBookingStore } from "../stores/bookingStore";
const store = useBookingStore();
</script>

<style scoped>
.zone-filter {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.section-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}
.zones-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.zone-chip {
  display: flex;
  align-items: center;
  padding: 4px 14px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}
.zone-chip input {
  display: none;
}
.zone-chip:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}
.zone-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
</style>
