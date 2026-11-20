/** The trimmed text, or undefined when there is none: for `??` fallbacks on optional names. */
export function nonBlank(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === "" ? undefined : trimmed;
}
