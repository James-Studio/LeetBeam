import Link from "next/link";

export function SiteHeader({ links }) {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark">LeetBeam</span>
      </Link>
      <nav className="top-nav">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function ProseShell({ eyebrow, title, children, actions, links }) {
  return (
    <main className="site-shell">
      <SiteHeader links={links} />
      <article className="prose-shell">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children}
        {actions ? <div className="prose-actions">{actions}</div> : null}
      </article>
    </main>
  );
}
