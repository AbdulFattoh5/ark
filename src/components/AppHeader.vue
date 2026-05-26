<template>
  <header class="app-header">
    <div class="header-brand">
      <span class="brand-label">AIRESTO</span>
      <span class="brand-sep">|</span>
      <span class="brand-name">{{
        store.restaurant?.restaurant_name ?? "Загрузка..."
      }}</span>
    </div>

    <div class="header-search">
      <span class="search-icon">⌘</span>
      <span class="search-hint">+Л поиск по имени</span>
    </div>

    <div class="header-right">
      <button v-if="hasSelection" class="btn-create" @click="$emit('create')">
        ✦ Создать
      </button>
      <button v-if="hasSelection" class="btn-cancel" @click="$emit('cancel')">
        ✕
      </button>
      <ThemeToggle />
      <button class="btn-logout">↪ Выйти</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useBookingStore } from "../stores/bookingStore";
import ThemeToggle from "./ThemeToggle.vue";

defineProps<{ hasSelection: boolean }>();
defineEmits<{ create: []; cancel: [] }>();

const store = useBookingStore();
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
  height: 52px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.brand-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.06em;
}
.brand-sep {
  color: var(--border-strong);
}
.brand-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.header-search {
  flex: 1;
  max-width: 300px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: text;
}
.search-icon {
  font-weight: 700;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.btn-create {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-create:hover {
  background: var(--accent-hover);
}
.btn-cancel {
  padding: 6px 10px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
}
.btn-logout {
  padding: 6px 12px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.btn-logout:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}
</style>
