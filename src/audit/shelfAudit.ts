import { getAccounts, getVisits } from '../data'

export interface AccountAudit {
  accountId: string
  weightedScore: number | null
  trend: 'up' | 'down' | 'flat' | null
  daysSinceVisit: number | null
  overdue: boolean
  status: 'healthy' | 'watch' | 'critical' | 'unvisited'
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const DAY_IN_MS = 24 * 60 * 60 * 1000
const WEIGHTS = [3, 2, 1]

function round2(value: number): number {
  const adjusted = value + Math.sign(value) * Number.EPSILON * 100
  return Math.round(adjusted * 100) / 100
}

function isValidIsoDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) {
    return false
  }

  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function toUtcMillis(isoDate: string): number {
  const [yearText, monthText, dayText] = isoDate.split('-')
  return Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText))
}

export function auditAccounts(asOf: string): AccountAudit[] {
  if (!isValidIsoDate(asOf)) {
    throw new Error(`Invalid date: ${asOf}`)
  }

  const allVisits = getVisits()
  const sortedAccounts = [...getAccounts()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )

  return sortedAccounts.map((account) => {
    const countedVisits = allVisits
      .filter((visit) => visit.accountId === account.id && visit.date <= asOf)
      .sort((left, right) => {
        const byDate = right.date.localeCompare(left.date)
        if (byDate !== 0) {
          return byDate
        }
        return right.id.localeCompare(left.id)
      })

    if (countedVisits.length === 0) {
      return {
        accountId: account.id,
        weightedScore: null,
        trend: null,
        daysSinceVisit: null,
        overdue: true,
        status: 'unvisited',
      }
    }

    const weightedVisits = countedVisits.slice(0, 3)
    let weightedSum = 0
    let totalWeight = 0

    weightedVisits.forEach((visit, index) => {
      const weight = WEIGHTS[index]
      weightedSum += visit.shelfScore * weight
      totalWeight += weight
    })

    const weightedScore = round2(weightedSum / totalWeight)

    let trend: 'up' | 'down' | 'flat' | null = null
    if (countedVisits.length >= 2) {
      const latest = countedVisits[0].shelfScore
      const previous = countedVisits[1].shelfScore
      if (latest > previous) {
        trend = 'up'
      } else if (latest < previous) {
        trend = 'down'
      } else {
        trend = 'flat'
      }
    }

    const daysSinceVisit = Math.floor(
      (toUtcMillis(asOf) - toUtcMillis(countedVisits[0].date)) / DAY_IN_MS,
    )
    const overdue = daysSinceVisit > 14

    const status =
      weightedScore < 2.5
        ? 'critical'
        : weightedScore < 3.5
          ? 'watch'
          : 'healthy'

    return {
      accountId: account.id,
      weightedScore,
      trend,
      daysSinceVisit,
      overdue,
      status,
    }
  })
}
