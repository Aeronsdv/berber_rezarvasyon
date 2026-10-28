CREATE EXTENSION IF NOT EXISTS btree_gist;

-- One active reservation per customer per Istanbul calendar day, across all shops.
CREATE UNIQUE INDEX "Appointment_customer_active_day" ON "Appointment" ("customerId", "date")
WHERE "status" IN ('PENDING', 'CONFIRMED');

-- Half-open ranges allow one appointment to begin exactly when another ends.
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_staff_no_overlap"
EXCLUDE USING gist ("staffId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&)
WHERE ("status" <> 'CANCELLED');

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_valid_interval" CHECK (
  "endMin" > "startMin" AND "startMin" >= 0 AND "endMin" < 1440 AND "endsAt" > "startsAt"
  AND to_char("startsAt" AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD') = "date"
  AND "startsAt" = (("date"::date + make_interval(mins => "startMin")) AT TIME ZONE 'Europe/Istanbul')
  AND "endsAt" = (("date"::date + make_interval(mins => "endMin")) AT TIME ZONE 'Europe/Istanbul')
);
ALTER TABLE "WorkingHours" ADD CONSTRAINT "WorkingHours_valid" CHECK ("dayOfWeek" BETWEEN 0 AND 6 AND "openMin" >= 0 AND "closeMin" < 1440 AND ("isClosed" OR "closeMin" > "openMin"));
ALTER TABLE "StaffHours" ADD CONSTRAINT "StaffHours_valid" CHECK ("dayOfWeek" BETWEEN 0 AND 6 AND "openMin" >= 0 AND "closeMin" < 1440 AND ("isClosed" OR "closeMin" > "openMin"));
ALTER TABLE "StaffBreak" ADD CONSTRAINT "StaffBreak_valid" CHECK ("startMin" >= 0 AND "endMin" < 1440 AND "endMin" > "startMin");
ALTER TABLE "Service" ADD CONSTRAINT "Service_valid" CHECK ("durationMinutes" BETWEEN 5 AND 480 AND "price" >= 0);
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_valid" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "Barbershop" ADD CONSTRAINT "Barbershop_valid" CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180 AND "slotInterval" IN (15,30) AND "bookingWindowDays" BETWEEN 1 AND 90);
