# EasyBook

A service for booking a time with the Owner.

## Language

**EasyBook**:
The product for booking a time with the Owner.
_Avoid_: Календарь звонков, calendar app, call

**Event type**:
A kind of booking the Owner offers, with an Owner-chosen id, a name, a description, and a duration in minutes.
_Avoid_: вид брони, call, meeting type, тип встречи

**Booking**:
A Guest's reservation of one interval for one Event type.
_Avoid_: встреча, событие, запись, appointment

**Upcoming Booking**:
A Booking whose interval has not ended.
_Avoid_: future-only booking, предстоящая встреча

**Slot**:
A start time offered for an Event type inside the booking window. It may be free or busy. Not an object the Owner creates.
_Avoid_: calendar cell, событие

**Owner**:
The single person in the owner role of one EasyBook.
_Avoid_: владелец календаря, calendar owner, user, owners

**Guest**:
A person using EasyBook who is not the Owner.
_Avoid_: клиент, пользователь, visitor
