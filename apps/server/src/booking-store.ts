import type { Interval } from "./slots.js";

export type StoredBooking = Interval & {
  eventTypeId: string;
  guestName: string;
  guestEmail: string;
};

// Half-open intervals: the end instant is free. The booking-rule probe breaks this line.
const overlaps = (a: Interval, b: Interval): boolean => a.start < b.end && b.start < a.end;

/**
 * The single timeline of EasyBook: one Booking blocks its interval for every Event type.
 * `reserve` checks and inserts without yielding, so overlapping creates leave one winner.
 */
export const createBookingStore = () => {
  const bookings: StoredBooking[] = [];
  return {
    reserve(candidate: StoredBooking): StoredBooking | "conflict" {
      if (bookings.some((existing) => overlaps(existing, candidate))) return "conflict";
      bookings.push(candidate);
      return candidate;
    },
    isBusy(interval: Interval): boolean {
      return bookings.some((existing) => overlaps(existing, interval));
    },
  };
};
