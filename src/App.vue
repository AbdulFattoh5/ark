<template>
  <div v-if="store.loading" class="loading-overlay">
    <div class="spinner" />
    <span>Загрузка данных...</span>
  </div>

  <div v-else-if="store.error" class="loading-overlay">
    <div class="error-box">
      <p>{{ store.error }}</p>
      <button @click="store.loadData()">Повторить</button>
    </div>
  </div>

  <template v-else>
    <AppHeader
      :has-selection="hasSelection"
      @create="gridRef?.createBooking()"
      @cancel="gridRef?.clearSelection()"
    />

    <div class="page-content">
      <h1 class="page-title">Бронирования</h1>
      <div class="filters-bar">
        <DateSelector />
        <ZoneFilter />
      </div>
      <BookingGrid ref="gridRef" />
    </div>
  </template>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useBookingStore } from "./stores/bookingStore";
import AppHeader from "./components/AppHeader.vue";
import DateSelector from "./components/DateSelector.vue";
import ZoneFilter from "./components/ZoneFilter.vue";
import BookingGrid from "./components/BookingGrid.vue";

const store = useBookingStore();
const gridRef = ref<InstanceType<typeof BookingGrid>>();
const hasSelection = computed(() => gridRef.value?.hasSelection ?? false);

onMounted(() => store.loadData());
</script>

<style scoped>
.page-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  padding: 16px 20px 12px;
  flex-shrink: 0;
}
.filters-bar {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px 16px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
}
</style>
