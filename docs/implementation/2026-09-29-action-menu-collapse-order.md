# FB-061~062 운용 메뉴 접힘·배치 개선

- 날짜: 2026-09-29
- 지금 확인할 한 가지: native details/summary로 변경, 기본 접힘. 화면 재렌더링과 재진입 시 접힘으로 시작. summary 키보드 조작 및 포커스 강조 제공.
- 시장·보유자산 영향 상세: 이동·시장 반영 요약과 함께 전체 운용 보기 바로 위로 이동. 기존 내용·펼침 상태 관리 유지, 중복 출력 제거.
- 검증: npm run build, npm run lint 통과. beginner-actions-ui, beginner-practice-ui, design-d2a, playtest-pacing-ui 4개 파일 32개 테스트 통과. 기본 접힘·게임 상태 보존·시장 상세 중복 없음·DOM 순서 확인.
- 운영: https://roll-your-pension.vercel.app/
- 배포 ID: dpl_8o59GEjdXy5VPM7tEQdUCQ58RFoq (READY, production)
- 문서·디자인 미추적 파일을 제외하고 dist만 분리해 prebuilt 배포. 운영 HTML의 JS/CSS를 내려받아 로컬 빌드와 바이트 단위 일치 확인.
- 운영 브라우저는 사용자의 첫 판 캐릭터 선택 화면에 있어 진행 상태를 변경하지 않음. 이번 배포의 브라우저 플레이·픽셀 검증은 별도 수행하지 않았으며, UI 동작은 happy-dom 회귀 테스트로 확인.
