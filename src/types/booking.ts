export type OrderStatus = "New" | "Bill" | "Closed" | "Banquet";
export type ReservationStatus =
  | "Живая очередь"
  | "Новая"
  | "Заявка"
  | "Открыт"
  | "Закрыт"
  | "Занял место"
  | "Вызвана"
  | "Отменен";

export interface Order {
  id: string;
  status: OrderStatus;
  start_time: string;
  end_time: string;
}

export interface Reservation {
  id: number;
  name_for_reservation: string;
  num_people: number;
  phone_number: string;
  status: ReservationStatus;
  seating_time: string;
  end_time: string;
}

export interface Table {
  id: string;
  number: string;
  zone: string;
  capacity: number;
  orders: Order[];
  reservations: Reservation[];
}

export interface Restaurant {
  id: number;
  timezone: string;
  restaurant_name: string;
  opening_time: string;
  closing_time: string;
}

export interface BookingResponse {
  current_day: string;
  available_days: string[];
  restaurant: Restaurant;
  tables: Table[];
}

export interface GridEvent {
  id: string | number;
  type: "order" | "reservation";
  status: string;
  startMinutes: number;
  durationMinutes: number;
  label: string;
  sublabel?: string;
  level: number;
  rawStart: string;
  rawEnd: string;
  tableId: string;
  numPeople?: number;
  phone?: string;
}

export interface TimeSlot {
  minutes: number;
  label: string;
  isHour: boolean;
}
