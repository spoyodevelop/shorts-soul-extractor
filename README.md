# Shorts Flagger

React와 Emotion을 사용하는 TypeScript 기반 Chrome Manifest V3 익스텐션입니다. 현재는 Shorts URL에서 영상 ID를 식별하고 기본 Unflag 또는 사용자가 토글한 Flag 상태를 IndexedDB에 저장합니다. 자막 수집·분석 기능은 아직 구현되지 않았습니다.

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

Chrome에서 `chrome://extensions`를 열고 **개발자 모드**를 켠 다음 **압축해제된 확장 프로그램을 로드합니다**를 눌러 이 프로젝트의 `dist/` 폴더를 선택하세요. YouTube에서 Shorts를 열면 영상 ID가 기본 `unflag`로 저장되고 화면 오른쪽 아래에 Flag 토글 버튼이 나타납니다. 버튼이나 `Z` 키를 누를 때마다 `flag`와 `unflag`가 전환됩니다. 입력 중인 텍스트 필드에서는 단축키가 작동하지 않습니다. 같은 Shorts로 돌아와도 저장된 상태를 유지합니다.

개발 중에는 다음 명령으로 TypeScript 변경 사항을 다시 빌드할 수 있습니다.

```sh
npm run dev
```

변경된 코드를 확인하려면 Chrome 확장 프로그램 페이지에서 확장 프로그램을 새로고침하고 YouTube Shorts 탭도 새로고침하세요. `manifest.json`을 바꾼 경우에는 `npm run dev`를 다시 시작하거나 `npm run build`를 다시 실행하세요.

## 구조

- `manifest.json`: MV3 설정. YouTube 페이지에 content script를 등록합니다.
- `src/content/main.tsx`: Shorts URL과 화면 전환을 감지하고 React UI를 Shadow DOM에 연결합니다.
- `src/content/FlagControl.tsx`: Emotion으로 스타일을 적용한 토글 버튼과 현재 라벨을 표시합니다.
- `src/background/main.ts`, `src/background/labels.ts`: 라벨 메시지를 처리하고 확장 프로그램 IndexedDB에 저장합니다.
- `scripts/build.mjs`: 확장 프로그램용 번들 생성. 결과물은 `dist/`에 저장됩니다.

현재 요구하는 권한은 없습니다. 기능을 추가할 때 필요한 권한만 manifest에 선언하세요.

## 만들 기능

사용자가 YouTube Shorts를 보다가 만난 영상 ID를 모읍니다. 각 영상의 기본 라벨은 `unflag`이며, 사용자가 버튼이나 `Z` 키로 `flag`와 `unflag`를 전환할 수 있습니다. 라벨은 두 상태만 사용하고, 영상별 최종 상태를 로컬에 저장합니다. 자막·메타데이터 수집 및 분석은 후속 작업으로 처리합니다.

현재 작업 범위는 `flag / unflag` 토글과 로컬 저장입니다. Jev에 전달하는 라벨은 10개 배치를 확정하는 시점에 고정하며, 이후 라벨 변경분을 다시 전달하지 않습니다.

1. **현재 Shorts 식별 (구현):** `/shorts/:id` 경로와 화면 전환을 감지하고 현재 영상의 `videoId`를 추출합니다.
2. **Flag 토글 (구현):** 처음 만난 영상은 `unflag`입니다. 한 버튼 또는 `Z` 키로 `unflag ↔ flag`를 전환합니다.
3. **로컬 저장 (구현):** 처음 만난 `videoId`는 기본 `unflag`로 IndexedDB에 저장합니다. 재방문 시 기존 Flag 상태를 덮어쓰지 않고, 토글할 때는 최종 라벨과 변경 시각을 갱신합니다. 최초 관찰 시각 `observedAt`은 따로 유지합니다.
4. **후속 수집 큐:** 저장된 영상에서 transcript와 metadata 수집을 시도합니다. 실패 기록과 재시도 상태를 남겨 영상 ID와 라벨이 사라지지 않게 합니다.
5. **Jev batch:** 서로 다른 Shorts ID 10개를 묶고, 배치 확정 시점의 `flag | unflag` 상태를 최종 입력으로 전달합니다. 이후 변경분은 다시 전달하지 않습니다. transcript가 없어도 유효한 샘플로 유지합니다.
6. **외부 연동 경계:** transcript provider 인터페이스를 두고 `youtubei.js` 등 적절한 라이브러리가 MV3 환경에서 동작하는지 검증한 뒤 연결합니다. Jev 분석과 YouTube의 실제 ‘관심 없음’ 동작은 우선 인터페이스와 mock으로 둡니다.

각 단계는 실제 Chrome에서 동작을 확인한 뒤 다음 단계로 진행합니다. 저장 동작은 자동 검사로 확인했으며, 실제 Chrome에서의 확인은 아직 필요합니다.
