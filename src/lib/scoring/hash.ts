import { createHash } from "node:crypto";

export function sourceDataHash(parts: {
  occupationCode: string;
  description: string;
  employedPersons: number | null;
  outlook: string;
}): string {
  const payload = JSON.stringify({
    occupationCode: parts.occupationCode,
    description: parts.description,
    employedPersons: parts.employedPersons,
    outlook: parts.outlook,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}
