import { customAlphabet } from "nanoid";

const nanoidAlphanumeric = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  16,
);

export function generateId(prefix: string): string {
  return `${prefix}_${nanoidAlphanumeric()}`;
}
