import { YoutubeTranscript } from "youtube-transcript";

// Fetch a YouTube video transcript as a single string. Returns null if no
// captions are available.
export async function fetchYoutubeTranscript(
  videoId: string,
): Promise<string | null> {
  try {
    const lines = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: "en",
    });
    if (!lines || lines.length === 0) return null;
    return lines
      .map((l) => l.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    // Try without language hint as a fallback.
    try {
      const lines = await YoutubeTranscript.fetchTranscript(videoId);
      if (!lines || lines.length === 0) return null;
      return lines
        .map((l) => l.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    } catch {
      return null;
    }
  }
}
