import coverageStyles from "../public-coverage.css?url";

export default function PublicCoverageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><link rel="stylesheet" href={coverageStyles} />{children}</>;
}
