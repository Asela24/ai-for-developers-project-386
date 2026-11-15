import "@typespec/http";
import "./event-types.tsp";

using TypeSpec.Http;

@service(#{ title: "EasyBook" })
namespace EasyBook;
