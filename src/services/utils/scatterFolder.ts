import { readDir } from '@tauri-apps/plugin-fs';

export function isScatterFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return (lower.endsWith('.txt') || lower.endsWith('.xml')) && lower.includes('scatter');
}

export async function findScatterInFolder(folder: string): Promise<string | null> {
  try {
    const entries = await readDir(folder);
    for (const entry of entries) {
      if (entry.isFile && entry.name && isScatterFileName(entry.name)) {
        return `${folder.replace(/[\\/]$/, '')}/${entry.name}`;
      }
    }
    for (const entry of entries) {
      if (entry.isDirectory && entry.name) {
        const subFolder = `${folder.replace(/[\\/]$/, '')}/${entry.name}`;
        const nested = await findScatterInFolder(subFolder);
        if (nested) return nested;
      }
    }
  } catch {
    return null;
  }
  return null;
}
