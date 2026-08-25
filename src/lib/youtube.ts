// Extract a YouTube video id from any common YouTube URL form, or return null.
export function extractYoutubeId(input: string): string | null {
  const s = (input || "").trim();
  if (!s) return null;

  // Already a bare 11-char id?
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;

  // Common URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return m[1];
  }
  return null;
}
