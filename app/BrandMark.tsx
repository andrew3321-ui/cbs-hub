type BrandMarkProps = {
  className?: string;
};

export default function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <span className={`cbs-brand-symbol ${className}`.trim()} aria-hidden="true">
      <i className="cbs-brand-link cbs-brand-link-a" />
      <i className="cbs-brand-link cbs-brand-link-b" />
      <i className="cbs-brand-node cbs-brand-node-center" />
      <i className="cbs-brand-node cbs-brand-node-top" />
      <i className="cbs-brand-node cbs-brand-node-right" />
      <i className="cbs-brand-node cbs-brand-node-bottom" />
    </span>
  );
}
