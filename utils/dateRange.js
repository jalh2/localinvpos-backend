const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const endOfDay = (date) => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

const parseDateRange = (query = {}) => {
  let from = query.from ? new Date(query.from) : null
  let to = query.to ? new Date(query.to) : null

  if (query.year) {
    const year = Number(query.year)
    const month = query.month ? Number(query.month) - 1 : 0
    const day = query.day ? Number(query.day) : 1
    from = startOfDay(new Date(year, month, day))
    to = query.day
      ? endOfDay(new Date(year, month, day))
      : query.month
        ? endOfDay(new Date(year, month + 1, 0))
        : endOfDay(new Date(year, 11, 31))
  }

  return {
    from: from && !Number.isNaN(from.getTime()) ? from.toISOString() : null,
    to: to && !Number.isNaN(to.getTime()) ? to.toISOString() : null
  }
}

const inRange = (value, range = {}) => {
  if (!value) return true
  const iso = new Date(value).toISOString()
  if (range.from && iso < range.from) return false
  if (range.to && iso > range.to) return false
  return true
}

module.exports = { parseDateRange, inRange }
