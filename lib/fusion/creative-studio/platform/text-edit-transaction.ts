/** UI lifecycle adapter only. The caller owns canonical commands and history. */
export type TextEditPhase = "preview" | "commit" | "cancel";
export type TextEditSink = (value: string, phase: TextEditPhase) => void;

export function createTextEditTransaction(source: string, apply: TextEditSink) {
  let value = source;
  let active = true;
  let previewed = false;
  // Native text controls expose LF. Preserve an untouched source byte-for-byte,
  // including mixed line endings; edited CRLF documents retain CRLF convention.
  const nativeSource = source.replace(/\r\n?/g, "\n");
  const decode = (input: string) => input === nativeSource ? source
    : source.includes("\r\n") && !source.replaceAll("\r\n", "").includes("\n")
      ? input.replace(/\r\n?/g, "\n").replaceAll("\n", "\r\n") : input;
  return {
    preview(input: string) {
      if (!active) return;
      const next = decode(input);
      if (next === value) return;
      value = next;
      previewed = true;
      apply(value, "preview");
    },
    finish(input: string, cancel = false) {
      if (!active) return;
      active = false; // Blur, cleanup and Escape cannot recommit a closed edit.
      value = decode(input);
      if (cancel || value === source) {
        if (previewed) apply(source, "cancel");
      } else apply(value, "commit");
    },
    cancel() {
      if (!active) return;
      active = false;
      if (previewed) apply(source, "cancel");
    },
  };
}
