import { buildBreadcrumbStructuredData, type BreadcrumbItem, serializeStructuredData } from "../domain/seo-structured-data.ts";

export function StructuredData({ value }: { value: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(value) }} />;
}

export function PublicPageBreadcrumb({ current, path }: { current: string; path: string }) {
  const items: BreadcrumbItem[] = [{ name: "Início", path: "/" }, { name: current, path }];
  return <StructuredData value={buildBreadcrumbStructuredData(items)} />;
}
