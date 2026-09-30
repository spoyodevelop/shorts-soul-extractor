import { css } from "@emotion/react";
import { useState } from "react";

type FlagControlProps = {
  videoId: string;
  onFlag: (videoId: string) => boolean;
};

export function FlagControl({ videoId, onFlag }: FlagControlProps) {
  const [requested, setRequested] = useState(false);

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (onFlag(videoId)) {
      setRequested(true);
    }
  }

  return (
    <div css={panelStyle}>
      <button css={buttonStyle} type="button" onClick={handleClick}>
        Flag
      </button>
      <p css={statusStyle} role="status">
        {requested
          ? "Flag 입력됨 · 아직 저장되지 않음"
          : "아직 저장되지 않습니다"}
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
`;

const statusStyle = css`
  margin: 6px 0 0;
  padding: 5px 8px;
  border-radius: 6px;
  background: #222;
  color: white;
  text-align: center;
`;
