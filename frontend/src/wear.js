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

//the systems a car can have and which catalogue categories feed each one
const systemList = [
  { key: 'engine', label: 'Engine', categories: ['Engine'] },
  { key: 'fluids', label: 'Fluids', categories: ['Fluids'] },
  { key: 'battery', label: 'Battery', categories: ['Electrical'] },
  { key: 'brakes', label: 'Brakes', categories: ['Brakes'] },
  { key: 'tyres', label: 'Tyres', categories: ['Tyres'] },
  { key: 'filters', label: 'Filters', categories: ['Filters'] },
]

//where each system sits on the xray picture of that car type, x and y are percent of the picture
//every type has its own picture so the dots are different, left puts the tag on the left of the dot
//tag is the longer name used on the picture, the battery of an electrified car is the big high voltage pack
const spots = {
  petrol: {
    engine: { x: 79.9, y: 49.7, left: true },
    fluids: { x: 91.6, y: 49.7, left: true },
    battery: { x: 85.9, y: 29.6, left: true },
    brakes: { x: 76.6, y: 73.5 },
    tyres: { x: 18.7, y: 20.2 },
    //oil and air filters sit in the engine bay so the dot goes there, not at the fuel tank
    filters: { x: 71, y: 37, left: true },
  },
  hybrid: {
    engine: { x: 82.5, y: 48.6, left: true },
    fluids: { x: 90.7, y: 36, left: true },
    battery: { x: 29.2, y: 48.6, tag: 'HV battery' },
    brakes: { x: 77, y: 73.7 },
    tyres: { x: 21.3, y: 17.6 },
    filters: { x: 75.4, y: 37.7, left: true },
  },
  phev: {
    engine: { x: 83.3, y: 40, left: true },
    fluids: { x: 90.4, y: 48.6, left: true },
    battery: { x: 43.3, y: 50.3, tag: 'HV battery' },
    brakes: { x: 77.1, y: 73.7 },
    tyres: { x: 21.3, y: 16.8 },
    filters: { x: 72, y: 28, left: true },
  },
  //no engine on an electric car, the picture has the big battery pack under the floor and a motor on each axle
  electric: {
    battery: { x: 47.5, y: 47.7, tag: 'HV battery' },
    fluids: { x: 79, y: 38.5 },
    brakes: { x: 78.8, y: 72 },
    tyres: { x: 20.8, y: 17.6 },
    filters: { x: 70.4, y: 25.1, left: true },
  },
}

//the picture for each car type
export const xrays = {
  petrol: { src: '/cars/xray.webp', alt: 'Xray view of a petrol car from above' },
  hybrid: { src: '/cars/xray-hybrid.webp', alt: 'Xray view of a hybrid car from above' },
  phev: { src: '/cars/xray-phev.webp', alt: 'Xray view of a plug-in hybrid from above' },
  electric: { src: '/cars/xray-electric.webp', alt: 'Xray view of an electric car from above' },
}

//lower is worse, a system shows its worst item
export const rank = { overdue: 0, due_soon: 1, unknown: 2, up_to_date: 3 }

//group schedule items into systems, items that are turned off dont count
export const buildSystems = (entries, powertrain = 'petrol') => {
  const where = spots[powertrain] || spots.petrol
  const list = []
  systemList.forEach((s) => {
    const items = entries.filter((e) => e.enabled && s.categories.includes(e.item.category))
    //a system with nothing to track, or no place on this car, is left out
    if (items.length === 0 || !where[s.key]) return
    let status = 'up_to_date'
    let used = 0
    items.forEach((e) => {
      if (rank[e.status] < rank[status]) status = e.status
      const u = usedPart(e)
      if (u !== null && u > used) used = u
    })
    items.sort((a, b) => rank[a.status] - rank[b.status])
    list.push({ ...s, ...where[s.key], items, status, used })
  })
  return list
}
