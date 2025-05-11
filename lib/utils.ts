import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { id } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import crypto from 'crypto';

// Function to hash IDs for endpoints
export function hashId(id: string | number): string {
  const idString = id.toString();
  // Using SHA-256 for secure hashing
  return crypto
    .createHash('sha256')
    .update(`${idString}-${process.env.NEXTAUTH_SECRET || 'fallback-secret'}`)
    .digest('hex');
}

// Function to verify a hashed ID
export function verifyHashedId(hashedId: string, originalId: string | number): boolean {
  const expectedHash = hashId(originalId);
  return crypto.timingSafeEqual(
    Buffer.from(hashedId),
    Buffer.from(expectedHash)
  );
}

// Format date untuk tampilan
export function formatDate(dateString: string | Date) {
  if (!dateString) return "";
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  return format(date, "d MMMM yyyy", { locale: id });
}
