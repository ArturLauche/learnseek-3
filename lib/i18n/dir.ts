const RTL = new Set(["ar", "he", "fa", "ur", "yi", "ps"]);

export function directionForLanguages(languages: string[] | undefined): "ltr" | "rtl" {
  const primary = (languages?.[0] ?? "en").toLowerCase().slice(0, 2);
  return RTL.has(primary) ? "rtl" : "ltr";
}
