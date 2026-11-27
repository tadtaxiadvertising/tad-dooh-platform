export interface ContentRequestMedia {
  filename: string | null;
  url: string | null;
}

function previewUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!/^https?:\/\//i.test(candidate) || /[\s\\]/u.test(candidate)) {
    return null;
  }
  try {
    const parsed = new URL(candidate);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

export function parseContentRequestMedia(data: unknown): ContentRequestMedia {
  let value: unknown = data;
  if (typeof data === "string") {
    try {
      value = JSON.parse(data);
    } catch {
      return { filename: null, url: null };
    }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { filename: null, url: null };
  }
  const { filename, url } = value as Record<string, unknown>;
  return {
    filename:
      typeof filename === "string" && filename.trim()
        ? filename.trim()
        : null,
    url: previewUrl(url),
  };
}
