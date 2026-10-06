import Link from "next/link";

export const CATALOG_PAGE_SIZE = 24;
export function pageNumber(value?: string | string[]) { const parsed = Number(Array.isArray(value) ? value[0] : value); return Number.isInteger(parsed) && parsed > 0 ? parsed : 1; }
export function pageItems<T>(items: T[], page: number) { return items.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE); }
export function CatalogPagination({ total, page, href }: { total: number; page: number; href: string }) {
  const pages = Math.ceil(total / CATALOG_PAGE_SIZE); if (pages <= 1) return null;
  return <nav className="catalog-pagination" aria-label="Каталогийн хуудас">{Array.from({ length: pages }, (_, index) => index + 1).map((number) => <Link key={number} className={number === page ? "active" : ""} href={`${href}?page=${number}`}>{number}</Link>)}</nav>;
}
