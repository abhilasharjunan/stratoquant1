import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function zodError(error: any) {
  return Object.values(error).flat().map((e: any) => e.message).join(", ");
}
