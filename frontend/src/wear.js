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

//car systems and where they sit on the xray picture, x and y are percent of the picture
//left means the tag goes on the left of the dot so it doesnt fall off the picture
const systemList = [
  { key: 'engine', label: 'Engine', categories: ['Engine'], x: 79.9, y: 49.7, left: true },
  { key: 'fluids', label: 'Fluids', categories: ['Fluids'], x: 91.6, y: 49.7, left: true },
  { key: 'battery', label: 'Battery', categories: ['Electrical'], x: 85.9, y: 29.6, left: true },
  { key: 'brakes', label: 'Brakes', categories: ['Brakes'], x: 76.6, y: 73.5 },
  { key: 'tyres', label: 'Tyres', categories: ['Tyres'], x: 18.7, y: 20.2 },
  //oil and air filters sit in the engine bay so the dot goes there, not at the fuel tank
  { key: 'filters', label: 'Filters', categories: ['Filters'], x: 71, y: 37, left: true },
]

//lower is worse, a system shows its worst item
export const rank = { overdue: 0, due_soon: 1, unknown: 2, up_to_date: 3 }

//group schedule items into systems, items that are turned off dont count
export const buildSystems = (entries) => {
  const list = []
  systemList.forEach((s) => {
    const items = entries.filter((e) => e.enabled && s.categories.includes(e.item.category))
    if (items.length === 0) return
    let status = 'up_to_date'
    let used = 0
    items.forEach((e) => {
      if (rank[e.status] < rank[status]) status = e.status
      const u = usedPart(e)
      if (u !== null && u > used) used = u
    })
    items.sort((a, b) => rank[a.status] - rank[b.status])
    list.push({ ...s, items, status, used })
  })
  return list
}
