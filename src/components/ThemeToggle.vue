<template>
  <button
    class="theme-toggle"
    @click="toggle"
    :title="isDark ? 'Светлая тема' : 'Тёмная тема'"
  >
    <span class="icon">{{ isDark ? "☀️" : "🌙" }}</span>
  </button>
</template>

<script setup lang="ts">
import { ref, watchEffect } from "vue";

const isDark = ref(
  localStorage.getItem("theme") === "dark" ||
    (!localStorage.getItem("theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
);

function toggle() {
  isDark.value = !isDark.value;
}

watchEffect(() => {
  const root = document.documentElement;
  root.setAttribute("data-theme", isDark.value ? "dark" : "light");
  localStorage.setItem("theme", isDark.value ? "dark" : "light");
});
</script>

<style scoped>
.theme-toggle {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: background 0.15s;
}
.theme-toggle:hover {
  background: var(--hover-bg);
}
</style>
