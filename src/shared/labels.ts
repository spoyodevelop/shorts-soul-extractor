export type Label = "flag" | "unflag";

export function nextLabel(current: Label | null): Label {
  if (current === "flag") {
    return "unflag";
  }
  return "flag";
}

export type LabeledShort = {
  videoId: string;
  label: Label;
  labeledAt: number;
};

export type LabelRequest =
  | { type: "labels:get"; videoId: string }
  | { type: "labels:save"; record: LabeledShort };

export type LabelResponse =
  | { ok: true; record: LabeledShort | null }
  | { ok: false; error: string };
