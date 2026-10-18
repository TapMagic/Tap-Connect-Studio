/**
 * Shared viewport layer authority for the public and preview Experience shell.
 * Authored content can use its own local stacking contexts, but system feedback
 * must always resolve through this global order.
 */
export const EXPERIENCE_SHELL_LAYERS = {
  content: 1,
  persistent: 20,
  navigation: 1200,
  accessNotice: 2400,
} as const;
