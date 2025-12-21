import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toTitleCase(input: string): string {
  return input
    .replace(/_/g, ' ')      // convert underscores to spaces
    .toLowerCase()
    .trim()
    .split(/\s+/)            // handle multiple spaces
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}
