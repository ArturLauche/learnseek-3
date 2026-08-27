type SceneSchema = {
  type?: string;
  body?: string;
  prompt?: string;
  choices?: string[];
  correctIndex?: number;
  front?: string;
  back?: string;
  events?: { year: string; label: string }[];
  left?: string;
  right?: string;
  code?: string;
  language?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderSceneHtml(schema: Record<string, unknown>, fallbackText: string): string {
  const scene = schema as SceneSchema;
  const type = scene.type ?? "prose";
  if (type === "quiz" && scene.prompt && Array.isArray(scene.choices)) {
  const buttons = scene.choices
    .map(
      (choice, index) =>
        `<button type="button" data-choice="${index}" data-correct="${index === scene.correctIndex ? "1" : "0"}" aria-label="${escapeHtml(choice)}">${escapeHtml(choice)}</button>`,
    )
    .join("");
  return `<article data-oriel-quiz><p id="oriel-quiz-prompt">${escapeHtml(scene.prompt)}</p><div class="choices" role="group" aria-labelledby="oriel-quiz-prompt">${buttons}</div><p data-feedback hidden aria-live="polite"></p></article>`;
  }
  if (type === "flashcard") {
    return `<article data-oriel-card><p data-front>${escapeHtml(scene.front ?? fallbackText)}</p><p data-back hidden>${escapeHtml(scene.back ?? "")}</p><button type="button" data-flip aria-label="Show other side of card">Show other side</button></article>`;
  }
  if (type === "timeline" && Array.isArray(scene.events)) {
    const items = scene.events
      .map((event) => `<li><strong>${escapeHtml(event.year)}</strong> ${escapeHtml(event.label)}</li>`)
      .join("");
    return `<article data-oriel-timeline><ol>${items}</ol></article>`;
  }
  if (type === "comparison") {
    return `<article data-oriel-compare><div><h2>A</h2><p>${escapeHtml(scene.left ?? "")}</p></div><div><h2>B</h2><p>${escapeHtml(scene.right ?? "")}</p></div></article>`;
  }
  if (type === "code") {
    return `<article data-oriel-code><pre><code data-lang="${escapeHtml(scene.language ?? "text")}">${escapeHtml(scene.code ?? fallbackText)}</code></pre></article>`;
  }
  return `<article data-oriel-prose>${escapeHtml(scene.body ?? fallbackText)
    .split("\n\n")
    .map((p) => `<p>${p}</p>`)
    .join("")}</article>`;
}
