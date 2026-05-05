# LunchPick

점심 메뉴를 빠르게 추천하고, 최근 선택과 즐겨찾기를 저장하는 Vercel 배포용 React 앱입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## 메뉴 수정

메뉴 목록은 `src/menus.js`에서 수정하면 됩니다. 카테고리 안의 메뉴 이름을 추가/삭제하거나, 새 카테고리를 추가하면 앱의 종류 필터와 추천 후보에 바로 반영됩니다.

## 배포

GitHub에 푸시한 뒤 Vercel에서 해당 저장소를 Import하면 됩니다.

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
