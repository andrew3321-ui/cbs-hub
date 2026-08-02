import taxContentStyles from "../tax-content.css?url";

export default function TaxContentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><link rel="stylesheet" href={taxContentStyles} />{children}</>;
}
