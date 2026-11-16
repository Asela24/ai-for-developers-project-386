import "@typespec/http";
import "@typespec/openapi";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

namespace EasyBook;

model EventType {
  @minLength(1)
  @maxLength(64)
  id: string;

  @minLength(1)
  @maxLength(120)
  name: string;

  @maxLength(2000)
  description: string;

  @minValue(15)
  @maxValue(540)
  durationMinutes: int32;
}

model CreateEventType {
  @minLength(1)
  @maxLength(64)
  id: string;

  @minLength(1)
  @maxLength(120)
  name: string;

  @maxLength(2000)
  description: string;

  @minValue(15)
  @maxValue(540)
  durationMinutes: int32;
}

model Failure {
  code: "data_error" | "conflict";
  message: string;
}

model EventTypeCreated {
  @statusCode statusCode: 201;
  @body body: EventType;
}

model DataError {
  @statusCode statusCode: 400;
  @body body: Failure;
}

@route("/event-types")
@tag("Event types")
interface EventTypes {
  @get
  @operationId("listEventTypes")
  listEventTypes(): EventType[];

  @post
  @operationId("createEventType")
  createEventType(@body body: CreateEventType): EventTypeCreated | DataError;

  /** Deletes the Event type and every Booking of it, ended ones included. */
  @delete
  @route("/{eventTypeId}")
  @operationId("deleteEventType")
  deleteEventType(@path eventTypeId: string): NoContentResponse | DataError;
}
