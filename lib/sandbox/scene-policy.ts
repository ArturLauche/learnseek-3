const SCHEMA_TYPES = new Set(["quiz", "flashcard", "timeline", "comparison", "code", "prose"]);

export type DraftScene = {
  kind: "schema" | "jsx" | "html";
  fallbackText: string;
  schema: Record<string, unknown>;
};

/** Prefer structured learning-scene schema; keep JSX only when schema cannot represent it. */
export function preferStructuredScene(scene: DraftScene): DraftScene {
  const type = typeof scene.schema.type === "string" ? scene.schema.type : "";
  if (SCHEMA_TYPES.has(type)) {
    return { ...scene, kind: "schema" };
  }
  if (scene.kind === "jsx") {
    const jsx = scene.schema.jsx ?? scene.schema.code;
    if (typeof jsx !== "string" || jsx.trim().length < 8) {
      return {
        ...scene,
        kind: "schema",
        schema: { type: "prose", body: scene.fallbackText, ...scene.schema },
      };
    }
  }
  return scene;
}
