// Client-side mirrors of the server's per-kind upload limits (see
// artifacts/api-server/src/routes/uploads.ts) — used only for instant
// feedback before the request is sent; the server enforces the real limit.
export const MAX_UPLOAD_BYTES = {
  image: 4 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  pdf: 8 * 1024 * 1024,
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
