import { useId } from "react";

type BrandMarkProps = {
  className?: string;
};

export default function BrandMark({ className = "" }: BrandMarkProps) {
  const id = useId().replaceAll(":", "");
  const backgroundId = `cbs-brand-background-${id}`;
  const glowId = `cbs-brand-glow-${id}`;
  const topLinkId = `cbs-brand-top-link-${id}`;
  const bottomLinkId = `cbs-brand-bottom-link-${id}`;

  return (
    <svg
      className={`cbs-brand-symbol ${className}`.trim()}
      viewBox="0 0 38 38"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={backgroundId} x1="5" y1="2" x2="34" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0D3143" />
          <stop offset="1" stopColor="#071D2B" />
        </linearGradient>
        <radialGradient id={glowId} cx="0" cy="0" r="1" gradientTransform="translate(31 5) rotate(135) scale(18)">
          <stop stopColor="#27C2B8" stopOpacity=".3" />
          <stop offset="1" stopColor="#27C2B8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={topLinkId} x1="10" y1="19" x2="27" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F4B94F" />
          <stop offset="1" stopColor="#27C2B8" />
        </linearGradient>
        <linearGradient id={bottomLinkId} x1="10" y1="19" x2="27" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F4B94F" />
          <stop offset="1" stopColor="#27C2B8" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="36" height="36" rx="11" fill={`url(#${backgroundId})`} stroke="#fff" strokeOpacity=".1" />
      <rect x="1" y="1" width="36" height="36" rx="11" fill={`url(#${glowId})`} />
      <path d="M10 18.75 25.2 8.5" stroke={`url(#${topLinkId})`} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 18.75 25.2 29" stroke={`url(#${bottomLinkId})`} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="19" r="4" fill="#F4B94F" stroke="#071D2B" strokeWidth="1.5" />
      <circle cx="28" cy="10" r="3" fill="#27C2B8" stroke="#fff" strokeOpacity=".85" strokeWidth="1.5" />
      <circle cx="31" cy="19" r="3" fill="#27C2B8" fillOpacity=".72" stroke="#fff" strokeOpacity=".61" strokeWidth="1.5" />
      <circle cx="28" cy="28" r="3" fill="#27C2B8" stroke="#fff" strokeOpacity=".85" strokeWidth="1.5" />
    </svg>
  );
}
