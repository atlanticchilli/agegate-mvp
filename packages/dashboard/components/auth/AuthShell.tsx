export function AuthShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main style={{ maxWidth: 480 }}>
      <div className="card column">
        <div>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
