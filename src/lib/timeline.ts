import { getDaysInMonth, getMonth, getDate } from "date-fns";

/**
 * Position of a date on the 12-month season axis, measured in months.
 * Jan 1 -> 0, Dec 31 -> just under 12.
 */
export function monthFraction(date: Date): number {
  return getMonth(date) + (getDate(date) - 1) / getDaysInMonth(date);
}

/** Same position expressed as a percentage of the axis width. */
export function axisPercent(date: Date): number {
  return (monthFraction(date) / 12) * 100;
}
