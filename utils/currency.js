const normalizeCurrency = (currency) => String(currency || 'LRD').toUpperCase()

const convert = (amount, from, to, rate = 180) => {
  const value = Number(amount) || 0
  const source = normalizeCurrency(from)
  const target = normalizeCurrency(to)
  const exchangeRate = Number(rate) || 180

  if (source === target) return value
  if (source === 'USD' && target === 'LRD') return value * exchangeRate
  if (source === 'LRD' && target === 'USD') return value / exchangeRate
  return value
}

const totalsFromLineItems = (items = []) => {
  return items.reduce((totals, item) => {
    const quantity = Number(item.quantity) || 0
    const usd = Number(item.priceAtSale && item.priceAtSale.USD) || 0
    const lrd = Number(item.priceAtSale && item.priceAtSale.LRD) || 0
    totals.totalUSD += quantity * usd
    totals.totalLRD += quantity * lrd
    return totals
  }, { totalUSD: 0, totalLRD: 0 })
}

module.exports = { normalizeCurrency, convert, totalsFromLineItems }
