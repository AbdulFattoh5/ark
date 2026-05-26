import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { fetchBookingData } from "../api/bookingApi";
import type { BookingResponse, GridEvent, Table } from "../types/booking";
import {
  isoToDateInTz,
  isoToMinutesInTz,
  parseTimeToMinutes,
} from "../utils/timeUtils";

const ORDER_LABELS: Record<string, string> = {
  New: "Новый заказ",
  Bill: "Счёт",
  Closed: "Закрыт",
  Banquet: "Банкет",
};

function assignLevels(events: GridEvent[]): GridEvent[] {
  const sorted = [...events].sort((a, b) => a.startMinutes - b.startMinutes);
  const levelEnds: number[] = [];
  return sorted.map((ev) => {
    let lvl = levelEnds.findIndex((end) => end <= ev.startMinutes - 30);
    if (lvl === -1) lvl = levelEnds.length;
    levelEnds[lvl] = ev.startMinutes + ev.durationMinutes;
    return { ...ev, level: lvl };
  });
}

export const useBookingStore = defineStore("booking", () => {
  const data = ref<BookingResponse | null>(null);
  const selectedDay = ref("");
  const activeZones = ref<Set<string>>(new Set());
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadData() {
    loading.value = true;
    error.value = null;
    try {
      data.value = await fetchBookingData();
      selectedDay.value = data.value.current_day;
      activeZones.value = new Set(data.value.tables.map((t) => t.zone));
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Ошибка загрузки";
    } finally {
      loading.value = false;
    }
  }

  const restaurant = computed(() => data.value?.restaurant ?? null);

  const availableDays = computed(() => data.value?.available_days ?? []);

  const allZones = computed((): string[] => {
    if (!data.value) return [];
    return [...new Set(data.value.tables.map((t) => t.zone))].sort();
  });

  const tablesByZone = computed((): Record<string, Table[]> => {
    if (!data.value) return {};
    const result: Record<string, Table[]> = {};
    for (const table of data.value.tables) {
      if (!activeZones.value.has(table.zone)) continue;
      if (!result[table.zone]) result[table.zone] = [];
      result[table.zone].push(table);
    }
    return result;
  });

  const openingMinutes = computed(() =>
    data.value ? parseTimeToMinutes(data.value.restaurant.opening_time) : 660
  );
  const closingMinutes = computed(() =>
    data.value ? parseTimeToMinutes(data.value.restaurant.closing_time) : 1420
  );

  const allFilteredTables = computed((): Table[] => {
    const result: Table[] = [];
    for (const zone of allZones.value) {
      const tables = tablesByZone.value[zone] ?? [];
      result.push(...tables);
    }
    return result;
  });

  const allEventsMap = computed((): Map<string, GridEvent[]> => {
    const map = new Map<string, GridEvent[]>();
    if (!data.value) return map;

    const tz = data.value.restaurant.timezone;
    const opening = openingMinutes.value;
    const day = selectedDay.value;

    for (const table of data.value.tables) {
      const events: GridEvent[] = [];

      for (const order of table.orders) {
        if (isoToDateInTz(order.start_time, tz) !== day) continue;
        const startMin = isoToMinutesInTz(order.start_time, tz);
        const endMin = isoToMinutesInTz(order.end_time, tz);
        events.push({
          id: order.id,
          type: "order",
          status: order.status,
          startMinutes: startMin - opening,
          durationMinutes: Math.max(endMin - startMin, 15),
          label: ORDER_LABELS[order.status] ?? order.status,
          level: 0,
          rawStart: order.start_time,
          rawEnd: order.end_time,
          tableId: table.id,
        });
      }

      for (const res of table.reservations) {
        if (isoToDateInTz(res.seating_time, tz) !== day) continue;
        const startMin = isoToMinutesInTz(res.seating_time, tz);
        const endMin = isoToMinutesInTz(res.end_time, tz);
        events.push({
          id: res.id,
          type: "reservation",
          status: res.status,
          startMinutes: startMin - opening,
          durationMinutes: Math.max(endMin - startMin, 15),
          label: res.name_for_reservation,
          sublabel: res.status,
          level: 0,
          rawStart: res.seating_time,
          rawEnd: res.end_time,
          tableId: table.id,
          numPeople: res.num_people,
          phone: res.phone_number,
        });
      }

      map.set(table.id, assignLevels(events));
    }

    return map;
  });

  function getEventsForTable(tableId: string): GridEvent[] {
    return allEventsMap.value.get(tableId) ?? [];
  }

  function getRowLevels(tableId: string): number {
    const events = allEventsMap.value.get(tableId) ?? [];
    if (!events.length) return 1;
    return Math.max(...events.map((e) => e.level)) + 1;
  }

  function toggleZone(zone: string) {
    if (activeZones.value.has(zone)) {
      activeZones.value.delete(zone);
    } else {
      activeZones.value.add(zone);
    }
  }

  return {
    data,
    selectedDay,
    activeZones,
    loading,
    error,
    restaurant,
    availableDays,
    allZones,
    tablesByZone,
    allFilteredTables,
    openingMinutes,
    closingMinutes,
    loadData,
    getEventsForTable,
    getRowLevels,
    toggleZone,
  };
});
