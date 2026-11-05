//how much of the interval is used up, 0 to 1, the bigger of the km part and the time part
//null when there is no due date to measure against
export const usedPart = (entry) => {
  const d = entry.due
  if (!d || !d.dueDate) return null
  let used = 0
  if (entry.intervalKm && d.remainingKm !== null) used = Math.max(used, 1 - d.remainingKm / entry.intervalKm)
  if (entry.intervalMonths && d.remainingDays !== null) used = Math.max(used, 1 - d.remainingDays / (entry.intervalMonths * 30.44))
  return Math.min(1, Math.max(0, used))
}
