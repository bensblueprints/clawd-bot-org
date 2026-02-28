interface PageHeaderProps {
  title: string;
  subtitle?: string;
  meta?: string;
}

export default function PageHeader({ title, subtitle, meta }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle && <p className="text-text-muted mt-1">{subtitle}</p>}
      {meta && <p className="text-xs text-text-muted mt-2">{meta}</p>}
    </div>
  );
}
