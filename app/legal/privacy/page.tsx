export default function PrivacyPage() {
  return (
    <article>
      <h1 className="text-4xl">Privacy</h1>
      <p className="mt-4 text-foreground-muted">Placeholder privacy notice for operators to complete.</p>
      <ul className="mt-4 list-disc ps-5">
        <li>Account data lives in your Postgres.</li>
        <li>Private uploads stay in your object store and are not distributed publicly.</li>
        <li>We do not train models on private user content unless a separate, revocable consent record exists.</li>
        <li>BYOK credentials are encrypted and never shown in full after storage.</li>
        <li>Logs must not include secrets, full prompts with user material, or sensitive PII.</li>
      </ul>
    </article>
  );
}
