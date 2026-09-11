import { buildBreadcrumbStructuredData, type BreadcrumbItem, serializeStructuredData } from "../domain/seo-structured-data.ts";

export function StructuredData({ value }: { value: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(value) }} />;
}

export function PublicPageBreadcrumb({ current, path, parent }: { current: string; path: string; parent?: BreadcrumbItem }) {
  const items: BreadcrumbItem[] = [{ name: "Início", path: "/" }, ...(parent ? [parent] : []), { name: current, path }];
  return <StructuredData value={buildBreadcrumbStructuredData(items)} />;
}
