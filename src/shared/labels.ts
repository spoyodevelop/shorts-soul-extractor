export type Label = "flag" | "unflag";

export function nextLabel(current: Label): Label {
  if (current === "flag") {
    return "unflag";
  }
  return "flag";
}

export type LabeledShort = {
  videoId: string;
  label: Label;
  observedAt: number;
  labeledAt: number;
};

export type LabelRequest =
  | { type: "labels:get"; videoId: string }
  | { type: "labels:observe"; videoId: string; observedAt: number }
  | { type: "labels:toggle"; videoId: string; labeledAt: number };

export type LabelResponse =
  | { ok: true; record: LabeledShort | null }
  | { ok: false; error: string };
