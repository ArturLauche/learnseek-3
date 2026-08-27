export default function TermsPage() {
  return (
    <article>
      <h1 className="text-4xl">Terms of use</h1>
      <p className="mt-4 text-foreground-muted">Placeholder terms for self-hosted Oriel. Replace with counsel-reviewed text before a public deployment.</p>
      <p className="mt-4">
        Oriel is free software. There are no paid tiers. You are responsible for the AI provider, storage, and
        moderation configuration you run. Do not upload material you do not have the right to use.
      </p>
      <nav className="mt-8 flex flex-wrap gap-4 text-sm" aria-label="Legal">
        <a href="/legal/privacy">Privacy</a>
        <a href="/legal/community">Community standards</a>
        <a href="/legal/copyright">Copyright complaints</a>
        <a href="/legal/creator-rights">Creator rights</a>
      </nav>
    </article>
  );
}
