import 'server-only'
import path from 'node:path'

export const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || './data/uploads')

// Résout un chemin sous UPLOADS_DIR et garantit qu'il n'en sort pas
// (protection anti path-traversal) — retourne null si le chemin est invalide.
export function resolveUploadPath(...segments: string[]): string | null {
  const resolved = path.resolve(UPLOADS_DIR, ...segments)
  if (resolved !== UPLOADS_DIR && !resolved.startsWith(UPLOADS_DIR + path.sep)) {
    return null
  }
  return resolved
}

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

export function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
}
