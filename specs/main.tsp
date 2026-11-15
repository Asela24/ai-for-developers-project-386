import "@typespec/http";
import "./event-types.tsp";
import "./slots.tsp";
import "./bookings.tsp";

using TypeSpec.Http;

@service(#{ title: "EasyBook" })
namespace EasyBook;
