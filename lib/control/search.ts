import type { PlatformPermission } from "@/lib/control/permissions";

export type ControlSearchEntity =
  | "user"
  | "invitation"
  | "business"
  | "role"
  | "permission"
  | "plan"
  | "service"
  | "entitlement"
  | "support_session"
  | "demo"
  | "demo_publication"
  | "audit"
  | "approval";

export type SearchRecord = {
  id: string;
  type: ControlSearchEntity;
  title: string;
  context: string;
  keywords: string[];
  href: string;
  requiredPermission: PlatformPermission;
};

export function searchControlRecords(input: {
  query: string;
  records: SearchRecord[];
  allowedPermissions: Set<string>;
  limit?: number;
}): SearchRecord[] {
  const tokens = input.query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return [];
  return input.records
    .filter((record) => input.allowedPermissions.has(record.requiredPermission))
    .map((record) => {
      const haystack = [
        record.title,
        record.context,
        record.type,
        ...record.keywords,
      ]
        .join(" ")
        .toLowerCase();
      const score = tokens.reduce(
        (total, token) =>
          total +
          (record.title.toLowerCase().includes(token) ? 4 : 0) +
          (haystack.includes(token) ? 1 : 0),
        0,
      );
      return { record, score };
    })
    .filter(({ score }) => score >= tokens.length)
    .sort(
      (a, b) =>
        b.score - a.score || a.record.title.localeCompare(b.record.title),
    )
    .slice(0, input.limit ?? 20)
    .map(({ record }) => record);
}

