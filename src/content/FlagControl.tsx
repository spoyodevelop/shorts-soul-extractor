import { css } from "@emotion/react";
import type { Label } from "../shared/labels";

export type LabelViewStatus = "loading" | "ready" | "saving" | "error";

type FlagControlProps = {
  videoId: string;
  label: Label;
  status: LabelViewStatus;
  onToggle: (videoId: string) => void;
  onRetry: (videoId: string) => void;
};

export function FlagControl({ videoId, label, status, onToggle, onRetry }: FlagControlProps) {
  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (status === "error") {
      onRetry(videoId);
      return;
    }
    onToggle(videoId);
  }

  let statusText = "현재: Unflag";
  if (label === "flag") {
    statusText = "현재: Flag";
  }
  if (status === "loading") {
    statusText = "Flag 상태 확인 중";
  } else if (status === "saving") {
    statusText = "변경 사항 저장 중";
  } else if (status === "error") {
    statusText = "처리 실패 · 다시 시도";
  }

  let buttonText = label === "flag" ? "Unflag" : "Flag";
  if (status === "error") {
    buttonText = "다시 시도";
  }
  const busy = status === "loading" || status === "saving";

  return (
    <div css={panelStyle}>
      <button css={buttonStyle} type="button" onClick={handleClick} disabled={busy}>
        {buttonText}
      </button>
      <p css={statusStyle} role="status">
        {statusText}
      </p>
    </div>
  );
}
const panelStyle = css`
  font:
    14px/1.4 system-ui,
    sans-serif;
`;

const buttonStyle = css`
  display: block;
  width: 100%;
  padding: 10px 16px;
  border: 0;
  border-radius: 999px;
  background: #d32f2f;
  color: white;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 10px #0005;

  &:hover {
    background: #b71c1c;
  }

  &:focus-visible {
    outline: 3px solid white;
    outline-offset: 2px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }
`;

const statusStyle = css`
  margin: 6px 0 0;
  padding: 5px 8px;
  border-radius: 6px;
  background: #222;
  color: white;
  text-align: center;
`;
