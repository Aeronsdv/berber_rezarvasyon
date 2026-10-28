import test from "node:test";
import assert from "node:assert/strict";
import { calculateSlots, canCancel, overlaps } from "../src/lib/scheduling";
import {
  today,
  instant,
  validDate,
  addDays,
  distanceKm,
} from "../src/lib/time";
import { bookingSchema, hoursSchema, shopSchema } from "../src/lib/validation";
const base = {
  date: "2030-01-07",
  duration: 50,
  step: 15,
  hours: { openMin: 540, closeMin: 660, isClosed: false },
  now: new Date("2030-01-06T10:00:00Z"),
};
test("50-minute service needs a continuous gap and respects end boundaries", () => {
  const slots = calculateSlots({
    ...base,
    staff: [{ id: "a", busy: [{ startMin: 600, endMin: 630 }] }],
  });
  assert.deepEqual(
    slots.map((s) => s.startMin),
    [540],
  );
});
test("any staff combines availability without admitting occupied staff", () => {
  const slots = calculateSlots({
    ...base,
    staff: [
      { id: "a", busy: [{ startMin: 540, endMin: 590 }] },
      { id: "b", busy: [] },
    ],
  });
  assert.deepEqual(slots[0].staffIds, ["b"]);
  assert.deepEqual(slots.at(-1)?.staffIds, ["a", "b"]);
});
test("staff-specific shifts, closure and breaks are intersected with shop hours", () => {
  const slots = calculateSlots({
    ...base,
    duration: 30,
    staff: [
      {
        id: "a",
        hours: { openMin: 570, closeMin: 645, isClosed: false },
        busy: [{ startMin: 600, endMin: 615 }],
      },
      {
        id: "b",
        hours: { openMin: 540, closeMin: 660, isClosed: true },
        busy: [],
      },
    ],
  });
  assert.deepEqual(
    slots.map((s) => s.startMin),
    [570, 615],
  );
});
test("same-day slots have 15-minute buffer in Istanbul timezone", () => {
  const slots = calculateSlots({
    ...base,
    now: new Date("2030-01-07T06:00:00Z"),
    duration: 30,
    staff: [{ id: "a", busy: [] }],
  });
  assert.equal(slots[0].startMin, 555);
});
test("closed shops and oversized services produce no slots", () => {
  assert.deepEqual(
    calculateSlots({
      ...base,
      hours: { ...base.hours, isClosed: true },
      staff: [{ id: "a", busy: [] }],
    }),
    [],
  );
  assert.deepEqual(
    calculateSlots({ ...base, duration: 180, staff: [{ id: "a", busy: [] }] }),
    [],
  );
});
test("touching appointment intervals do not overlap", () => {
  assert.equal(
    overlaps({ startMin: 540, endMin: 570 }, { startMin: 570, endMin: 600 }),
    false,
  );
});
test("cancel window includes exactly two hours and rejects one millisecond later", () => {
  const start = new Date("2030-01-07T10:00:00Z");
  assert.equal(canCancel(start, new Date("2030-01-07T08:00:00Z")), true);
  assert.equal(canCancel(start, new Date("2030-01-07T08:00:00.001Z")), false);
});
test("Istanbul day changes at 21:00 UTC", () => {
  assert.equal(today(new Date("2030-01-06T21:00:00Z")), "2030-01-07");
  assert.equal(
    instant("2030-01-07", 540).toISOString(),
    "2030-01-07T06:00:00.000Z",
  );
});
test("invalid dates are rejected, including normalization and non leap years", () => {
  assert.equal(validDate("2030-02-30"), false);
  assert.equal(validDate("2027-02-29"), false);
  assert.equal(validDate("2028-02-29"), true);
  assert.equal(addDays("2030-12-31", 1), "2031-01-01");
});
test("validation rejects tampered times and repeated weekdays", () => {
  assert.equal(
    bookingSchema.safeParse({
      shopId: "x",
      serviceId: "s",
      staffId: "a",
      date: "2030-02-30",
      startMin: -1,
    }).success,
    false,
  );
  assert.equal(
    hoursSchema.safeParse(
      Array.from({ length: 7 }, () => ({
        dayOfWeek: 1,
        openMin: 540,
        closeMin: 1200,
        isClosed: false,
      })),
    ).success,
    false,
  );
  assert.equal(
    shopSchema.safeParse({ name: "abc", latitude: 91 }).success,
    false,
  );
});
test("haversine returns zero for same coordinates", () => {
  assert.equal(
    distanceKm(
      { latitude: 41, longitude: 29 },
      { latitude: 41, longitude: 29 },
    ),
    0,
  );
});
