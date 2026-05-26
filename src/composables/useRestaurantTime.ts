import { ref, computed, onMounted, onUnmounted } from "vue";
import { isoToMinutesInTz } from "../utils/timeUtils";

export function useRestaurantTime(timezone: () => string) {
  const now = ref(new Date());
  let timer: ReturnType<typeof setInterval>;

  onMounted(() => {
    timer = setInterval(() => {
      now.value = new Date();
    }, 1000);
  });
  onUnmounted(() => clearInterval(timer));

  const timeStr = computed(() => {
    const tz = timezone();
    if (!tz) return "";
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(now.value);
  });

  const currentMinutes = computed(() => {
    const tz = timezone();
    if (!tz) return -1;
    return isoToMinutesInTz(now.value.toISOString(), tz);
  });

  return { timeStr, currentMinutes };
}
