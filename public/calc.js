// Date and swipe math, kept free of the DOM so it can be tested (see test/calc.test.js).

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Whole calendar days from a to b. Uses UTC day numbers so DST shifts can't add or drop a day.
export function daysBetween(a, b) {
  var utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  var utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / MS_PER_DAY);
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// "MM/DD", "MM/DD/YY" or "MM/DD/YYYY" -> { month, day, year }, with year null when omitted.
// Returns null for anything malformed (including impossible dates like 2/30).
function splitDate(str) {
  var match = String(str || "").trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/);
  if (!match) {
    return null;
  }
  var month = Number(match[1]);
  var day = Number(match[2]);
  var year = match[3] ? Number(match[3]) : null;
  if (year != null && year < 100) {
    year += 2000;
  }
  // 2028 is a leap year, so 2/29 passes the check when no year is given
  var check = new Date(year ?? 2028, month - 1, day);
  if (check.getMonth() != month - 1 || check.getDate() != day) {
    return null;
  }
  return { month, day, year };
}

// Resolve a typed date to a Date. Without a year, the academic year can span two calendar
// years, so pick the closest matching MM/DD on or after `ref` ("after") or on or before it ("before").
export function parseDate(str, ref, direction = "after") {
  var parts = splitDate(str);
  if (!parts) {
    return null;
  }
  if (parts.year != null) {
    return new Date(parts.year, parts.month - 1, parts.day);
  }
  var candidate = new Date(ref.getFullYear(), parts.month - 1, parts.day);
  if (direction == "after" && candidate < startOfDay(ref)) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  } else if (direction == "before" && candidate > startOfDay(ref)) {
    candidate.setFullYear(candidate.getFullYear() - 1);
  }
  return candidate;
}

// Days of a break that fall between today and the final day.
// Inclusive of start, exclusive of end; breaks that are over (or blank/invalid) count as 0.
export function breakDays(fromStr, toStr, today, finalDay) {
  var fromParts = splitDate(fromStr);
  var toParts = splitDate(toStr);
  if (!fromParts || !toParts) {
    return 0;
  }
  // A yearless end date follows an explicit start year, otherwise today
  var end = parseDate(toStr, fromParts.year != null ? parseDate(fromStr, today) : today, "after");
  var start = parseDate(fromStr, end, "before");

  var from = start > today ? start : today;
  var to = end < finalDay ? end : finalDay;
  return Math.max(0, daysBetween(from, to));
}

// Work out how many swipes to use per day.
// Returns { remainingDays, swipesPerDay, swipesFinalDay, finalDay, runOutEarlyDays } or { error }.
export function calculateSwipes({ swipes, endDate, breaks = [], extraDaysOff = 0, today = new Date() }) {
  today = startOfDay(today);
  var blank = String(swipes ?? "").trim() == "";
  swipes = Number(swipes);
  if (blank || !Number.isFinite(swipes) || swipes < 0) {
    return { error: "enter your current number of swipes." };
  }

  var finalDay = parseDate(endDate, today, "after");
  if (!finalDay) {
    return { error: "enter the semester end date as MM/DD or MM/DD/YYYY." };
  }

  var breakSum = breaks.reduce((sum, b) => sum + breakDays(b.from, b.to, today, finalDay), 0);
  var remainingDays = daysBetween(today, finalDay) - breakSum - extraDaysOff;
  if (remainingDays < 1) {
    return { error: "you have no days left to use swipes. is the end date in the past? did you add one too many break days?" };
  }

  // Spread swipes over every day but the last; whatever doesn't divide evenly is left for the final day
  var swipesPerDay = remainingDays > 1 ? Math.floor(swipes / (remainingDays - 1)) : 0;
  var swipesFinalDay = swipes - swipesPerDay * (remainingDays - 1);

  // With a big leftover, show how early one extra swipe a day would run out
  var runOutEarlyDays = swipesFinalDay > 7 ? Math.floor(remainingDays - swipes / (swipesPerDay + 1)) : null;

  return { remainingDays, swipesPerDay, swipesFinalDay, finalDay, runOutEarlyDays };
}
