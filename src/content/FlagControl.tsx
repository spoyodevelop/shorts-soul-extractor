import { css } from "@emotion/react";
import type { Label } from "../shared/labels";

export type LabelViewStatus = "loading" | "ready" | "saving" | "error";

type FlagControlProps = {
  videoId: string;
  label: Label | null;
  status: LabelViewStatus;
  onFlag: (videoId: string) => void;
};

export function FlagControl({ videoId, label, status, onFlag }: FlagControlProps) {
  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onFlag(videoId);
  }

  let statusText = "라벨 없음";
  if (status === "loading") {
    statusText = "라벨 확인 중";
  } else if (status === "saving") {
    statusText = "Flag 저장 중";
  } else if (status === "error") {
    statusText = "라벨 처리 실패 · Flag로 재시도";
  } else if (label === "flag") {
    statusText = "Flag 저장됨";
  } else if (label === "unflag") {
    statusText = "Unflag 저장됨";
  }

  return (
    <div css={panelStyle}>
      <button css={buttonStyle} type="button" onClick={handleClick} disabled={status === "saving"}>
        Flag
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
