export type AccessNoticeContent = {
  title: string;
  message: string;
};

export function accessNoticeContent(input: {
  actionLabel?: string;
  title?: string;
  message?: string;
}): AccessNoticeContent {
  const actionLabel = input.actionLabel?.trim() || "Content";
  const title = input.title?.trim()
    || (/access$/i.test(actionLabel) ? `${actionLabel} Required` : `${actionLabel} Access Required`);
  return {
    title,
    message: input.message?.trim() || "This content requires additional access.",
  };
}
