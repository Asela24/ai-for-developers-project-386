import "@typespec/http";
import "@typespec/openapi";
import "./event-types.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

namespace EasyBook;

/** A start offered for one Event type. A busy Slot carries no Guest identity. */
model Slot {
  start: utcDateTime;
  end: utcDateTime;
  status: "free" | "busy";
}

@route("/event-types/{eventTypeId}/slots")
@tag("Slots")
interface Slots {
  @get
  @operationId("listSlots")
  listSlots(@path eventTypeId: string): Slot[] | DataError;
}
