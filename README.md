# Shorts Flagger

React와 Emotion을 사용하는 TypeScript 기반 Chrome Manifest V3 익스텐션입니다. 현재는 Shorts URL에서 영상 ID를 식별하고 Flag 라벨을 IndexedDB에 저장합니다. Unflag UI·단축키·자막 수집·분석 기능은 아직 구현되지 않았습니다.

코드 수정 시에는 [코드 작성 원칙](AGENTS.md)을 따릅니다.

## 요구 사항

- Node.js 22 이상
- npm
- Chrome

## 시작하기

```sh
npm install
npm run check
```

Chrome에서 `chrome://extensions`를 열고 **개발자 모드**를 켠 다음 **압축해제된 확장 프로그램을 로드합니다**를 눌러 이 프로젝트의 `dist/` 폴더를 선택하세요. YouTube에서 Shorts를 열면 화면 오른쪽 아래에 Flag 버튼이 나타납니다. 버튼을 누르면 영상 ID, `flag` 라벨, 입력 시각이 확장 프로그램의 IndexedDB에 저장되고 UI에 성공 여부가 표시됩니다. 같은 Shorts로 돌아와도 저장된 라벨을 읽어 표시합니다.

개발 중에는 다음 명령으로 TypeScript 변경 사항을 다시 빌드할 수 있습니다.

```sh
npm run dev
```

변경된 코드를 확인하려면 Chrome 확장 프로그램 페이지에서 확장 프로그램을 새로고침하고 YouTube Shorts 탭도 새로고침하세요. `manifest.json`을 바꾼 경우에는 `npm run dev`를 다시 시작하거나 `npm run build`를 다시 실행하세요.

## 구조

- `manifest.json`: MV3 설정. YouTube 페이지에 content script를 등록합니다.
- `src/content/main.tsx`: Shorts URL과 화면 전환을 감지하고 React UI를 Shadow DOM에 연결합니다.
- `src/content/FlagControl.tsx`: Emotion으로 스타일을 적용한 Flag 버튼과 저장 상태를 표시합니다.
- `src/background/main.ts`, `src/background/labels.ts`: 라벨 메시지를 처리하고 확장 프로그램 IndexedDB에 저장합니다.
- `scripts/build.mjs`: 확장 프로그램용 번들 생성. 결과물은 `dist/`에 저장됩니다.

현재 요구하는 권한은 없습니다. 기능을 추가할 때 필요한 권한만 manifest에 선언하세요.

## 만들 기능

사용자가 YouTube Shorts를 보다가 직접 Flag 또는 Unflag하면, 최종 라벨을 먼저 로컬에 저장하고 자막·메타데이터 수집 및 분석은 후속 작업으로 처리하는 MVP를 만듭니다. 시청 시간이나 넘긴 영상처럼 라벨을 누르지 않은 행동은 학습 데이터로 사용하지 않습니다.

1. **현재 Shorts 식별 (구현):** `/shorts/:id` 경로와 화면 전환을 감지하고 현재 영상의 `videoId`를 추출합니다.
2. **명시적 라벨 입력 (Flag 버튼 구현):** Flag와 Unflag를 독립적인 라벨로 다룹니다. 다음 UI 단계에서 Unflag 버튼과 `Z`(Flag), `U`(Unflag) 단축키를 추가하고, 입력 중인 텍스트 필드에서는 단축키가 작동하지 않도록 합니다.
3. **즉시 저장 (Flag 연결):** 라벨 시점의 `videoId`, 최종 `label`, `labeledAt`을 IndexedDB에 저장합니다. 같은 영상의 라벨을 다시 저장하면 최종 상태가 남으며, 저장 성공 여부를 사용자에게 알려줍니다.
4. **후속 수집 큐:** 라벨링된 항목에서 transcript와 metadata 수집을 시도합니다. 실패 기록과 재시도 상태를 남겨 라벨이 사라지지 않게 합니다.
5. **Jev batch:** 서로 다른 명시적 라벨 샘플 10개가 쌓이면 각 영상의 최종 라벨과 함께 전달합니다. transcript가 없어도 유효한 샘플로 유지합니다.
6. **외부 연동 경계:** transcript provider 인터페이스를 두고 `youtubei.js` 등 적절한 라이브러리가 MV3 환경에서 동작하는지 검증한 뒤 연결합니다. Jev 분석과 YouTube의 실제 ‘관심 없음’ 동작은 우선 인터페이스와 mock으로 둡니다.

각 단계는 실제 Chrome에서 동작을 확인한 뒤 다음 단계로 진행합니다. 저장 동작은 자동 검사로 확인했으며, 실제 Chrome에서의 확인은 아직 필요합니다.
