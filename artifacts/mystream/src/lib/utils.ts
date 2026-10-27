import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Decode entities as text only; never parse a complete title as HTML.
export function decodeMediaText(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/&(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]+);/gi, entity => {
    const decoder = document.createElement('textarea');
    decoder.innerHTML = entity;
    return decoder.value;
  });
}
