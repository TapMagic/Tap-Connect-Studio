import { nativeMediaAssetId } from "./native-media-url";
/** Projection grants a publication credential; canonical Asset references stay unchanged. */
export function projectPublicExperienceMedia<T>(value: T, slug: string): T {
  const project = (item: unknown): unknown => {
    if (typeof item === "string" && nativeMediaAssetId(item))
      return `${item}?publication=${encodeURIComponent(slug)}`;
    if (Array.isArray(item)) return item.map(project);
    if (item && typeof item === "object")
      return Object.fromEntries(
        Object.entries(item).map(([key, entry]) => [key, project(entry)]),
      );
    return item;
  };
  return project(value) as T;
}
