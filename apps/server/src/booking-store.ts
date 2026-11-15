import { randomUUID } from "node:crypto";
import type { Interval } from "./slots.js";

type BookingRequest = Interval & {
  eventTypeId: string;
  guestName: string;
  guestEmail: string;
};

/** A reserved Booking; `id` is assigned by the store and never changes. */
export type StoredBooking = BookingRequest & { id: string };

// Half-open intervals: the end instant is free. The booking-rule probe breaks this line.
const overlaps = (a: Interval, b: Interval): boolean => a.start < b.end && b.start < a.end;

/**
 * The single timeline of EasyBook: one Booking blocks its interval for every Event type.
 * `reserve` checks and inserts without yielding, so overlapping creates leave one winner.
 * Ended Bookings stay stored; `upcoming` only leaves them out.
 */
export const createBookingStore = () => {
  const bookings: StoredBooking[] = [];
  return {
    reserve(candidate: BookingRequest): StoredBooking | "conflict" {
      if (bookings.some((existing) => overlaps(existing, candidate))) return "conflict";
      const reserved = { ...candidate, id: randomUUID() };
      bookings.push(reserved);
      return reserved;
    },
    /** Bookings whose interval has not ended at `now` (in progress included), by start. */
    upcoming(now: Date): StoredBooking[] {
      return bookings
        .filter((booking) => booking.end > now)
        .toSorted((a, b) => a.start.getTime() - b.start.getTime());
    },
    /** Removes every Booking of the Event type, ended ones included, freeing their intervals. */
    removeByEventType(eventTypeId: string): void {
      const kept = bookings.filter((booking) => booking.eventTypeId !== eventTypeId);
      bookings.splice(0, bookings.length, ...kept);
    },
    /** Deletes the Booking with this id; `false` when there is none. Its interval is free at once. */
    remove(id: string): boolean {
      const index = bookings.findIndex((booking) => booking.id === id);
      if (index === -1) return false;
      bookings.splice(index, 1);
      return true;
    },
    isBusy(interval: Interval): boolean {
      return bookings.some((existing) => overlaps(existing, interval));
    },
  };
};
