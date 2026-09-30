type ShortcutKey = Pick<
  KeyboardEvent,
  "code" | "key" | "repeat" | "isComposing" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey"
>;

export function isToggleKey(event: ShortcutKey): boolean {
  // The physical Z key also works when the keyboard is in Korean input mode.
  const zKey = event.code === "KeyZ" || (event.code === "" && event.key.toLowerCase() === "z");
  const modified = event.altKey || event.ctrlKey || event.metaKey;
  return zKey && !modified && !event.repeat && !event.isComposing;
}
