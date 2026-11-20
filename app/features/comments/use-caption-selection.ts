import { useEffect, useState } from "react";

const MAX_QUOTE = 300;

/**
 * The text the user selected inside a post's caption (the element marked data-caption-of="<postId>"), for quoting it
 * in a comment; null when nothing in that caption is selected. The backend checks the quote is part of the caption.
 */
export function useCaptionSelection(postId: string): string | null {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const onChange = () => {
      const selection = document.getSelection();
      const caption = document.querySelector(`[data-caption-of="${CSS.escape(postId)}"]`);
      const text = selection?.toString().trim() ?? "";
      const inside =
        caption !== null &&
        selection !== null &&
        selection.rangeCount > 0 &&
        caption.contains(selection.anchorNode) &&
        caption.contains(selection.focusNode);
      setSelected(inside && text !== "" ? text.slice(0, MAX_QUOTE) : null);
    };
    document.addEventListener("selectionchange", onChange);
    return () => {
      document.removeEventListener("selectionchange", onChange);
    };
  }, [postId]);

  return selected;
}
