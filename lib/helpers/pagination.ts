export type PaginationInput = {
  page?: number
  limit?: number
  maxLimit?: number
}

export function resolvePagination(input: PaginationInput) {
  const page = Math.max(1, input.page ?? 1)
  const rawLimit = input.limit ?? 20
  const maxLimit = input.maxLimit ?? 100
  const limit = Math.min(maxLimit, Math.max(1, rawLimit))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

export function buildPaginationMeta(total: number, page: number, limit: number) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  }
}
