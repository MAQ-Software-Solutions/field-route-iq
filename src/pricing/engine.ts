import type {
  Account,
  BogoPromotion,
  PercentOffPromotion,
  Product,
  Promotion,
  ThresholdPromotion,
} from '../data'
import { getAccount, getProducts, getPromotions } from '../data'

export interface CartLine {
  productId: string
  qty: number
}

export interface PriceOrderInput {
  lines: CartLine[]
  accountId: string
  date: string
}

export interface PricedLine {
  productId: string
  qty: number
  unitPrice: number
  gross: number
  appliedPromoId: string | null
  discount: number
  net: number
}

export interface PricedOrder {
  lines: PricedLine[]
  orderLevel: { appliedPromoId: string | null; discount: number }
  subtotal: number
  total: number
}

interface LinePromoCandidate {
  promo: PercentOffPromotion | BogoPromotion
  discount: number
}

interface OrderPromoCandidate {
  promo: ThresholdPromotion
  discount: number
}

function round2(value: number): number {
  const adjusted = value + Math.sign(value) * Number.EPSILON * 100
  return Math.round(adjusted * 100) / 100
}

function isPromoActive(promo: Promotion, date: string): boolean {
  return promo.validFrom <= date && date <= promo.validTo
}

function isPromoEligible(promo: Promotion, account: Account): boolean {
  if (!promo.eligibleSegments) {
    return true
  }
  return promo.eligibleSegments.includes(account.segment)
}

function isPreferredPromo(
  contender: { validFrom: string; id: string },
  current: { validFrom: string; id: string },
): boolean {
  if (contender.validFrom !== current.validFrom) {
    return contender.validFrom < current.validFrom
  }
  return contender.id < current.id
}

function getPercentOffDiscount(
  promo: PercentOffPromotion,
  line: CartLine,
  product: Product,
  gross: number,
): number {
  const matchesCategory = promo.scope.category === product.category
  const matchesProduct = (promo.scope.productIds ?? []).includes(line.productId)
  if (!matchesCategory && !matchesProduct) {
    return 0
  }
  return round2((gross * promo.percent) / 100)
}

function getBogoDiscount(
  promo: BogoPromotion,
  line: CartLine,
  product: Product,
): number {
  if (promo.productId !== line.productId) {
    return 0
  }
  const groupSize = promo.buyQty + promo.getQty
  const completeGroups = Math.floor(line.qty / groupSize)
  const freeUnits = completeGroups * promo.getQty
  return round2(freeUnits * product.unitPrice)
}

function selectBestLinePromotion(
  line: CartLine,
  product: Product,
  gross: number,
  account: Account,
  date: string,
  promotions: Promotion[],
): { appliedPromoId: string | null; discount: number } {
  let best: LinePromoCandidate | null = null

  for (const promo of promotions) {
    if (promo.type === 'threshold') {
      continue
    }
    if (!isPromoActive(promo, date) || !isPromoEligible(promo, account)) {
      continue
    }

    const discount =
      promo.type === 'percent_off'
        ? getPercentOffDiscount(promo, line, product, gross)
        : getBogoDiscount(promo, line, product)

    if (discount <= 0) {
      continue
    }

    if (
      best === null ||
      discount > best.discount ||
      (discount === best.discount && isPreferredPromo(promo, best.promo))
    ) {
      best = { promo, discount }
    }
  }

  if (best === null) {
    return { appliedPromoId: null, discount: 0 }
  }

  return {
    appliedPromoId: best.promo.id,
    discount: round2(best.discount),
  }
}

function qualifiesThresholdPromotion(
  promo: ThresholdPromotion,
  lines: PricedLine[],
  productById: Map<string, Product>,
): boolean {
  const categoryNet = lines.reduce((sum, line) => {
    const product = productById.get(line.productId)
    if (!product) {
      throw new Error(`Unknown product: ${line.productId}`)
    }
    return product.category === promo.category ? sum + line.net : sum
  }, 0)

  return round2(categoryNet) >= promo.minSubtotal
}

function selectBestOrderPromotion(
  lines: PricedLine[],
  account: Account,
  date: string,
  promotions: Promotion[],
  productById: Map<string, Product>,
): { appliedPromoId: string | null; discount: number } {
  let best: OrderPromoCandidate | null = null

  for (const promo of promotions) {
    if (promo.type !== 'threshold') {
      continue
    }
    if (!isPromoActive(promo, date) || !isPromoEligible(promo, account)) {
      continue
    }
    if (!qualifiesThresholdPromotion(promo, lines, productById)) {
      continue
    }

    const discount = round2(promo.amountOff)
    if (
      best === null ||
      discount > best.discount ||
      (discount === best.discount && isPreferredPromo(promo, best.promo))
    ) {
      best = { promo, discount }
    }
  }

  if (best === null) {
    return { appliedPromoId: null, discount: 0 }
  }

  return {
    appliedPromoId: best.promo.id,
    discount: round2(best.discount),
  }
}

export function priceOrder(input: PriceOrderInput): PricedOrder {
  const account = getAccount(input.accountId)
  if (!account) {
    throw new Error(`Unknown account: ${input.accountId}`)
  }

  const productById = new Map(getProducts().map((product) => [product.id, product]))
  const promotions = getPromotions()

  const pricedLines: PricedLine[] = input.lines.map((line) => {
    const product = productById.get(line.productId)
    if (!product) {
      throw new Error(`Unknown product: ${line.productId}`)
    }
    if (!Number.isInteger(line.qty) || line.qty <= 0) {
      throw new Error(`Invalid qty for ${line.productId}`)
    }

    const gross = round2(product.unitPrice * line.qty)
    const linePromo = selectBestLinePromotion(
      line,
      product,
      gross,
      account,
      input.date,
      promotions,
    )
    const net = Math.max(0, round2(gross - linePromo.discount))

    return {
      productId: line.productId,
      qty: line.qty,
      unitPrice: product.unitPrice,
      gross,
      appliedPromoId: linePromo.appliedPromoId,
      discount: round2(linePromo.discount),
      net,
    }
  })

  const subtotal = round2(pricedLines.reduce((sum, line) => sum + line.net, 0))
  const orderLevel = selectBestOrderPromotion(
    pricedLines,
    account,
    input.date,
    promotions,
    productById,
  )
  const total = Math.max(0, round2(subtotal - orderLevel.discount))

  return {
    lines: pricedLines,
    orderLevel,
    subtotal,
    total,
  }
}
