import { getProduct, getRoutes } from '../data'
import { priceOrder } from '../pricing/engine'
import type { CartLine } from '../pricing/engine'

export interface SettleRouteInput {
  routeId: string
  date: string
  orders: Array<{ accountId: string; lines: CartLine[] }>
}

export interface RouteSettlement {
  routeId: string
  date: string
  grossTotal: number
  lineDiscountTotal: number
  orderDiscountTotal: number
  discountTotal: number
  netTotal: number
  perCategory: Record<string, number>
  promoUsage: Record<string, number>
  commission: number
  stopsVisited: string[]
  stopsMissed: string[]
}

const TIER_1_CAP = 200
const TIER_2_CAP = 500

function round2(value: number): number {
  const adjusted = value + Math.sign(value) * Number.EPSILON * 100
  return Math.round(adjusted * 100) / 100
}

function sortedRecord(values: Record<string, number>): Record<string, number> {
  const sorted: Record<string, number> = {}
  for (const key of Object.keys(values).sort((left, right) => left.localeCompare(right))) {
    sorted[key] = values[key]
  }
  return sorted
}

function calculateCommission(netTotal: number): number {
  let totalCommission = 0

  const tierOneAmount = Math.min(netTotal, TIER_1_CAP)
  if (tierOneAmount > 0) {
    totalCommission += tierOneAmount * 0.02
  }

  if (netTotal > TIER_1_CAP) {
    const tierTwoAmount = Math.min(netTotal - TIER_1_CAP, TIER_2_CAP - TIER_1_CAP)
    totalCommission += tierTwoAmount * 0.05
  }

  if (netTotal > TIER_2_CAP) {
    totalCommission += (netTotal - TIER_2_CAP) * 0.08
  }

  return round2(totalCommission)
}

export function settleRoute(input: SettleRouteInput): RouteSettlement {
  const route = getRoutes().find((candidate) => candidate.id === input.routeId)
  if (!route) {
    throw new Error(`Unknown route: ${input.routeId}`)
  }

  const stopAccountIds = route.stops.map((stop) => stop.accountId)
  const stopSet = new Set(stopAccountIds)

  input.orders.forEach((order) => {
    if (!stopSet.has(order.accountId)) {
      throw new Error(`Account not on route: ${order.accountId}`)
    }
  })

  const pricedOrders = input.orders.map((order) =>
    priceOrder({
      lines: order.lines,
      accountId: order.accountId,
      date: input.date,
    }),
  )

  let grossTotalRaw = 0
  let lineDiscountTotalRaw = 0
  let orderDiscountTotalRaw = 0
  let netTotalRaw = 0
  const perCategoryRaw: Record<string, number> = {}
  const promoUsageRaw: Record<string, number> = {}

  pricedOrders.forEach((pricedOrder) => {
    orderDiscountTotalRaw += pricedOrder.orderLevel.discount
    netTotalRaw += pricedOrder.total

    if (pricedOrder.orderLevel.appliedPromoId) {
      promoUsageRaw[pricedOrder.orderLevel.appliedPromoId] =
        (promoUsageRaw[pricedOrder.orderLevel.appliedPromoId] ?? 0) + 1
    }

    pricedOrder.lines.forEach((line) => {
      grossTotalRaw += line.gross
      lineDiscountTotalRaw += line.discount

      if (line.appliedPromoId) {
        promoUsageRaw[line.appliedPromoId] =
          (promoUsageRaw[line.appliedPromoId] ?? 0) + 1
      }

      const product = getProduct(line.productId)
      if (!product) {
        throw new Error(`Unknown product: ${line.productId}`)
      }

      perCategoryRaw[product.category] = (perCategoryRaw[product.category] ?? 0) + line.net
    })
  })

  const grossTotal = round2(grossTotalRaw)
  const lineDiscountTotal = round2(lineDiscountTotalRaw)
  const orderDiscountTotal = round2(orderDiscountTotalRaw)
  const discountTotal = round2(lineDiscountTotal + orderDiscountTotal)
  const netTotal = round2(netTotalRaw)

  const perCategoryRounded: Record<string, number> = {}
  Object.entries(perCategoryRaw).forEach(([category, value]) => {
    perCategoryRounded[category] = round2(value)
  })

  const visitedSet = new Set(input.orders.map((order) => order.accountId))
  const seenVisitedStops = new Set<string>()
  const stopsVisited: string[] = []
  const stopsMissed: string[] = []

  stopAccountIds.forEach((accountId) => {
    if (visitedSet.has(accountId)) {
      if (!seenVisitedStops.has(accountId)) {
        seenVisitedStops.add(accountId)
        stopsVisited.push(accountId)
      }
    } else {
      stopsMissed.push(accountId)
    }
  })

  return {
    routeId: input.routeId,
    date: input.date,
    grossTotal,
    lineDiscountTotal,
    orderDiscountTotal,
    discountTotal,
    netTotal,
    perCategory: sortedRecord(perCategoryRounded),
    promoUsage: sortedRecord(promoUsageRaw),
    commission: calculateCommission(netTotal),
    stopsVisited,
    stopsMissed,
  }
}
