UPDATE "Service"
SET "durationMinutes" = CASE
  WHEN "durationMinutes" <= 22 THEN 15
  WHEN "durationMinutes" <= 37 THEN 30
  WHEN "durationMinutes" <= 52 THEN 45
  ELSE 60
END
WHERE "durationMinutes" NOT IN (15, 30, 45, 60);

ALTER TABLE "Service" DROP CONSTRAINT "Service_valid";
ALTER TABLE "Service" ADD CONSTRAINT "Service_valid"
  CHECK ("durationMinutes" IN (15, 30, 45, 60) AND "price" >= 0);
