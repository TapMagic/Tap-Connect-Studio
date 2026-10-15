export type PhonePreviewPageContext = {
  pageId: string;
  title: string;
  homePageId: string;
  homeTitle: string;
};

/** The entry Page changes the QR destination, never the signed session identity. */
export function phonePreviewEntryUrl(
  previewUrl: string,
  entryTarget: "home" | "current",
  page: PhonePreviewPageContext | null | undefined,
): string {
  const url = new URL(previewUrl);
  const pageId = entryTarget === "current" ? page?.pageId : page?.homePageId;
  if (pageId && pageId !== page?.homePageId) url.searchParams.set("page", pageId);
  else url.searchParams.delete("page");
  return url.toString();
}
