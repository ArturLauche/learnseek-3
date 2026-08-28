import { describe, expect, it } from "vitest";
import { detectLanguage, parseSilenceChapters } from "@/lib/media/video";

describe("video pipeline helpers", () => {
  it("detects german and english from text", () => {
    expect(detectLanguage("The leaf and the electron path.")).toBe("en");
    expect(detectLanguage("Das ist nicht der Fall und die Pflanze atmet.")).toBe("de");
  });

  it("parses silencedetect chapters from ffmpeg stderr", () => {
    const stderr = "silence_start: 1.2\nsilence_start: 12.5\nsilence_start: 40";
    const chapters = parseSilenceChapters(stderr);
    expect(chapters.length).toBe(3);
    expect(chapters[0]?.startMs).toBe(1200);
    expect(chapters[0]?.label).toMatch(/Chapter/);
  });
});
