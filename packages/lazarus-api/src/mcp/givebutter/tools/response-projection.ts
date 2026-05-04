import { TGivebutterPagination, TPaginated } from '@mcp/givebutter/types/givebutter.types'

export type TFieldList = readonly string[]

export type TProjectedPage<T> = {
  data: Partial<T>[]
  page?: { page: number; pages: number; total: number }
}

const pickFields = <T extends object>(obj: T, fields: TFieldList): Partial<T> => {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    if (f in obj) out[f] = (obj as Record<string, unknown>)[f]
  }
  return out as Partial<T>
}

const compressMeta = (meta?: TGivebutterPagination): TProjectedPage<never>['page'] =>
  meta ? { page: meta.current_page, pages: meta.last_page, total: meta.total } : undefined

const mergeFields = (base: TFieldList, extra?: string[]): TFieldList =>
  extra && extra.length ? Array.from(new Set([...base, ...extra])) : base

export const projectItem = <T extends object>(
  item: T,
  base: TFieldList,
  extra?: string[],
): Partial<T> => pickFields(item, mergeFields(base, extra))

export const projectList = <T extends object>(
  res: TPaginated<T>,
  base: TFieldList,
  extra?: string[],
): TProjectedPage<T> => {
  const fields = mergeFields(base, extra)
  return {
    data: (res.data ?? []).map((row) => pickFields(row, fields)),
    page: compressMeta(res.meta),
  }
}
