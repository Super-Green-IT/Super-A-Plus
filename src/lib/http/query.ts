export function parsePagination(searchParams: URLSearchParams, defaultLimit: number) {
  const pageValue = searchParams.get('page') ?? '1'
  const limitValue = searchParams.get('limit') ?? String(defaultLimit)
  if (!/^\d+$/.test(pageValue) || !/^\d+$/.test(limitValue)) return null

  const page = Number(pageValue)
  const requestedLimit = Number(limitValue)
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000) return null
  if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1) return null

  const limit = Math.min(100, requestedLimit)
  return { page, limit, skip: (page - 1) * limit }
}
