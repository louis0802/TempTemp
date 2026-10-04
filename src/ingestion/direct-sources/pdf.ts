/** Separate native-text evidence parser. No OCR and no guessed column associations. */
export function associatedNativePdfText(
  nativeText: string | null,
  offerTitle: string,
): { text: string | null; issue: string | null } {
  if (nativeText === null)
    return { text: null, issue: "pdf_native_text_unavailable" };
  const lines = nativeText.trim().split(/\r?\n/);
  if (nativeText.includes("\f") || lines.some((line) => /\S {3,}\S/.test(line)))
    return { text: null, issue: "pdf_layout_ambiguous" };
  if (
    lines[0].trim() !== offerTitle ||
    !lines.slice(1).some((line) => line.trim())
  )
    return { text: null, issue: "pdf_offer_association_unknown" };
  return {
    text: lines
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n"),
    issue: null,
  };
}
