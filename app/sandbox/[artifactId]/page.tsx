export default async function SandboxPage({ params }: { params: Promise<{ artifactId: string }> }) {
  const { artifactId } = await params;
  return (
    <main className="p-6 text-sm">
      <h1 className="font-serif text-xl">Isolated experience</h1>
      <p className="mt-3 text-foreground-muted">
        Artifact {artifactId} renders on a separate origin with a restrictive CSP and an iframe sandbox that does not
        include allow-same-origin. Cookies, parent DOM, and unrestricted network are out of bounds.
      </p>
    </main>
  );
}
