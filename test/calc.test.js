// Run with `npm test`. Pinned to Central time so the DST cases cross a real clock change.
process.env.TZ = "America/Chicago";

import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateSwipes, breakDays, daysBetween, parseDate } from "../public/calc.js";

const date = (y, m, d) => new Date(y, m - 1, d);
const MID_OCTOBER = date(2026, 10, 14);
const FALL_END = date(2026, 12, 19);

// Average cases, using Vanderbilt's 2026-27 undergraduate calendar

test("fall semester with no breaks", () => {
  const r = calculateSwipes({ swipes: 150, endDate: "12/19", today: MID_OCTOBER });
  assert.equal(r.remainingDays, 66);
  assert.equal(r.swipesPerDay, 2);
  assert.equal(r.swipesFinalDay, 20);
  assert.deepEqual(r.finalDay, FALL_END);
  assert.equal(r.runOutEarlyDays, 16);
});

test("fall semester with fall break and a 9-day Thanksgiving", () => {
  const r = calculateSwipes({
    swipes: 150,
    endDate: "12/19",
    breaks: [{ from: "10/22", to: "10/24" }, { from: "11/21", to: "11/30" }],
    today: MID_OCTOBER,
  });
  assert.equal(r.remainingDays, 55);
  assert.equal(r.swipesPerDay, 2);
  assert.equal(r.swipesFinalDay, 42);
  assert.equal(r.runOutEarlyDays, 5);
});

test("'# of days' breaks subtract the same as date breaks", () => {
  const r = calculateSwipes({ swipes: 150, endDate: "12/19", extraDaysOff: 11, today: MID_OCTOBER });
  assert.equal(r.remainingDays, 55);
  assert.equal(r.swipesPerDay, 2);
});

test("spring semester with spring break", () => {
  const r = calculateSwipes({
    swipes: 300,
    endDate: "05/06",
    breaks: [{ from: "03/13", to: "03/22" }],
    today: date(2027, 1, 11),
  });
  assert.equal(r.remainingDays, 106);
  assert.equal(r.swipesPerDay, 2);
  assert.equal(r.swipesFinalDay, 90);
});

test("explicit 4- and 2-digit years are respected", () => {
  assert.deepEqual(parseDate("12/19/2026", MID_OCTOBER), FALL_END);
  assert.deepEqual(parseDate("12/19/26", MID_OCTOBER), FALL_END);
});

test("blank or malformed break rows are ignored", () => {
  assert.equal(breakDays("", "", MID_OCTOBER, FALL_END), 0);
  assert.equal(breakDays("11/21", "nope", MID_OCTOBER, FALL_END), 0);
});

test("no swipes means zero per day", () => {
  const r = calculateSwipes({ swipes: 0, endDate: "12/19", today: MID_OCTOBER });
  assert.equal(r.swipesPerDay, 0);
  assert.equal(r.swipesFinalDay, 0);
});

// Edge cases that used to give wrong answers

test("a yearless end date resolves to its next occurrence, even across New Year", () => {
  const r = calculateSwipes({ swipes: 300, endDate: "05/06", today: MID_OCTOBER });
  assert.deepEqual(r.finalDay, date(2027, 5, 6));
  assert.equal(r.remainingDays, 204);
  assert.ok(r.swipesPerDay >= 0);
});

test("a winter break across New Year counts its real length", () => {
  const finalDay = date(2027, 5, 6);
  assert.equal(breakDays("12/13", "01/10", MID_OCTOBER, finalDay), 28);
});

test("a break that has already ended counts as 0 days", () => {
  assert.equal(breakDays("09/01", "09/05", MID_OCTOBER, FALL_END), 0);
  assert.equal(breakDays("09/01/2026", "09/05/2026", MID_OCTOBER, FALL_END), 0);
});

test("a break in progress counts only the days still ahead", () => {
  assert.equal(breakDays("10/20", "10/25", date(2026, 10, 22), FALL_END), 3);
});

test("the fall DST change doesn't add an extra day", () => {
  assert.equal(daysBetween(date(2026, 10, 31), date(2026, 11, 2)), 2);
  const r = calculateSwipes({ swipes: 150, endDate: "12/12", today: MID_OCTOBER });
  assert.equal(r.remainingDays, 59);
});

test("the spring DST change doesn't drop a day", () => {
  assert.equal(daysBetween(date(2027, 3, 13), date(2027, 3, 15)), 2);
  assert.equal(breakDays("03/13", "03/22", date(2027, 1, 11), date(2027, 5, 6)), 9);
});

test("an even split uses every swipe instead of shorting each day", () => {
  const one = calculateSwipes({ swipes: 60, endDate: "12/14", today: MID_OCTOBER });
  assert.equal(one.remainingDays, 61);
  assert.equal(one.swipesPerDay, 1);
  assert.equal(one.swipesFinalDay, 0);

  const two = calculateSwipes({ swipes: 120, endDate: "12/14", today: MID_OCTOBER });
  assert.equal(two.swipesPerDay, 2);
  assert.equal(two.swipesFinalDay, 0);
});

test("a break running past the semester end is cut off there", () => {
  const r = calculateSwipes({
    swipes: 150,
    endDate: "12/12",
    breaks: [{ from: "12/10", to: "01/10/27" }],
    today: MID_OCTOBER,
  });
  assert.equal(r.remainingDays, 57);
});

test("an end date in the past is an error, not negative swipes", () => {
  const r = calculateSwipes({ swipes: 150, endDate: "12/19/2025", today: MID_OCTOBER });
  assert.ok(r.error);
});

test("too many break days is an error", () => {
  const r = calculateSwipes({ swipes: 150, endDate: "12/19", extraDaysOff: 100, today: MID_OCTOBER });
  assert.ok(r.error);
});

test("invalid end dates and missing swipes are errors", () => {
  assert.ok(calculateSwipes({ swipes: 150, endDate: "13/40", today: MID_OCTOBER }).error);
  assert.ok(calculateSwipes({ swipes: 150, endDate: "02/30", today: MID_OCTOBER }).error);
  assert.ok(calculateSwipes({ swipes: "", endDate: "12/19", today: MID_OCTOBER }).error);
});
