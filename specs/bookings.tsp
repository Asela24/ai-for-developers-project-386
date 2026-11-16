import "@typespec/http";
import "@typespec/openapi";
import "./event-types.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

namespace EasyBook;

model CreateBooking {
  @minLength(1)
  @maxLength(64)
  eventTypeId: string;

  /** Must be the start of an offered Slot of that Event type. */
  start: utcDateTime;

  @minLength(1)
  @maxLength(120)
  guestName: string;

  /** One `@` with text on both sides. */
  @minLength(1)
  @maxLength(254)
  @pattern("^[^@]+@[^@]+$")
  guestEmail: string;
}

/** What the Guest gets back on create: no id, so nothing to delete the Booking with. */
model Booking {
  eventTypeId: string;
  start: utcDateTime;
  end: utcDateTime;
  guestName: string;
  guestEmail: string;
}

/** A Booking as the Owner reads it, with the id that deletes it. */
model OwnerBooking {
  /** Stable identifier of this Booking, assigned on create. */
  id: string;

  ...Booking;
}

model BookingCreated {
  @statusCode statusCode: 201;
  @body body: Booking;
}

model Conflict {
  @statusCode statusCode: 409;
  @body body: Failure;
}

@route("/bookings")
@tag("Bookings")
interface Bookings {
  @post
  @operationId("createBooking")
  createBooking(@body body: CreateBooking): BookingCreated | DataError | Conflict;

  /** Upcoming Bookings of every Event type: the interval has not ended yet. */
  @get
  @operationId("listUpcomingBookings")
  listUpcomingBookings(): OwnerBooking[];
}

model BookingDeleted {
  @statusCode statusCode: 204;
}

@route("/bookings/{id}")
@tag("Bookings")
interface BookingById {
  /** Owner deletes a Booking: its interval is free at once for every Event type. An unknown id is a data error. */
  @delete
  @operationId("deleteBooking")
  deleteBooking(@path id: string): BookingDeleted | DataError;
}
