import styles from "./press-kit.css?url";

export default function PressKitLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><link rel="stylesheet" href={styles} />{children}</>;
}
