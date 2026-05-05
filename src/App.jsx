import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// 최근 확정한 메뉴를 브라우저에 저장할 때 쓰는 키입니다.
// 서버 없이도 새로고침 후 기록을 유지하기 위해 localStorage를 사용합니다.
const STORAGE_KEY = "lunchpick_recent_v3";

// 메뉴 원본 데이터는 사람이 관리하기 쉽게 카테고리별 이름 목록으로 둡니다.
// 요청에 맞춰 아시안/카페는 제거했고, 필터는 종류와 가격만 사용합니다.
const MENU_GROUPS = {
  한식: [
    "김치찌개", "된장찌개", "순두부찌개", "부대찌개", "청국장", "비빔밥", "돌솥비빔밥", "제육볶음", "오징어볶음", "불고기",
    "갈비탕", "설렁탕", "순대국", "감자탕", "닭갈비", "찜닭", "보쌈", "족발", "냉면", "칼국수",
    "콩국수", "쌈밥", "생선구이", "삼겹살", "육회비빔밥", "김치볶음밥", "국밥", "낙지볶음", "닭곰탕", "수육국밥"
  ],
  중식: [
    "짜장면", "짬뽕", "볶음밥", "탕수육", "마라탕", "마라샹궈", "양꼬치", "고추잡채", "유린기", "깐풍기",
    "딤섬", "우육면", "멘보샤", "꿔바로우", "고추짬뽕", "잡채밥", "유산슬밥", "군만두"
  ],
  일식: [
    "돈까스", "치즈돈까스", "라멘", "초밥", "회덮밥", "규동", "가츠동", "오므라이스", "우동", "소바",
    "텐동", "카레", "사케동", "야키소바", "타코야키", "오코노미야키", "가라아게", "돈부리"
  ],
  양식: [
    "파스타", "크림파스타", "토마토파스타", "스테이크", "리조또", "피자", "필라프", "샐러드", "포케", "브런치",
    "그라탕", "라자냐", "수프", "치킨랩", "함박스테이크", "로제파스타", "치킨스테이크", "감바스"
  ],
  분식: [
    "떡볶이", "김밥", "라볶이", "순대", "튀김", "잔치국수", "쫄면", "만두", "분식 오므라이스", "어묵탕",
    "참치김밥", "돈까스김밥", "비빔국수", "김치말이국수", "라면", "치즈김밥", "고기만두", "칼만두"
  ],
  패스트푸드: [
    "햄버거", "치킨버거", "샌드위치", "토스트", "치킨", "핫도그", "타코", "부리또", "감자튀김 세트", "랩 샌드위치",
    "서브 샌드위치", "치킨텐더", "나초", "피쉬버거", "불고기버거", "치킨너겟", "더블버거", "클럽샌드위치"
  ]
};

// 필터 버튼에 표시될 값들입니다. "전체"와 "상관없음"은 필터를 적용하지 않는 상태입니다.
const CATEGORIES = ["전체", ...Object.keys(MENU_GROUPS)];
const PRICES = ["상관없음", "저렴", "보통", "비쌈"];

// 카테고리별 대표 이모지입니다. 개별 메뉴마다 이미지를 관리하지 않아도 결과 카드가 허전하지 않게 해줍니다.
const EMOJI_BY_CATEGORY = {
  한식: "🍚",
  중식: "🥡",
  일식: "🍱",
  양식: "🍝",
  분식: "🍢",
  패스트푸드: "🍔"
};

// 메뉴 이름에 포함된 단어를 기준으로 태그/가격을 자동 추론합니다.
// 메뉴를 추가할 때 매번 객체 정보를 직접 쓰지 않기 위한 간단한 룰 엔진입니다.
const SOUP_WORDS = ["찌개", "탕", "국", "국밥", "라멘", "우동", "짬뽕", "칼국수", "국수", "수프", "어묵탕", "라면", "칼만두"];
const SPICY_WORDS = ["김치", "짬뽕", "마라", "떡볶이", "라볶이", "쫄면", "낙지", "오징어", "닭갈비", "비빔", "로제"];
const LIGHT_WORDS = ["샐러드", "포케", "샌드위치", "소바", "냉면", "콩국수", "토스트", "랩"];
const EXPENSIVE_WORDS = ["스테이크", "초밥", "삼겹살", "족발", "보쌈", "갈비", "피자", "양꼬치", "마라샹궈", "사케동", "감바스"];
const CHEAP_WORDS = ["김밥", "라볶이", "순대", "튀김", "토스트", "핫도그", "잔치국수", "짜장면", "볶음밥", "어묵", "라면", "만두"];

function includesAny(text, words) {
  // words 중 하나라도 text 안에 포함되어 있으면 true입니다.
  return words.some((word) => text.includes(word));
}

function buildMenu(category, name, index) {
  const tags = new Set();

  // 가격은 메뉴 이름 키워드 기반으로 추정합니다.
  // 삼항 연산자를 중첩해서 "비쌈 > 저렴 > 보통" 우선순위로 판단합니다.
  const price = includesAny(name, EXPENSIVE_WORDS) ? "비쌈" : includesAny(name, CHEAP_WORDS) ? "저렴" : "보통";

  // 결과 카드에 보여줄 설명 태그입니다. 필터에는 사용하지 않습니다.
  if (includesAny(name, SOUP_WORDS)) tags.add("국물");
  if (includesAny(name, SPICY_WORDS)) tags.add("매콤");
  if (includesAny(name, LIGHT_WORDS)) tags.add("가볍게");
  if (!tags.has("가볍게")) tags.add("든든");
  if (["중식", "분식", "패스트푸드", "양식"].includes(category)) tags.add("배달 가능");

  return {
    // id는 React key와 결과 애니메이션 key에 사용됩니다.
    id: `${category}-${index}-${name}`,
    name,
    emoji: EMOJI_BY_CATEGORY[category] || "🍽️",
    category,
    tags: Array.from(tags),
    price
  };
}

// 카테고리별 이름 목록을 실제 추천에 쓸 메뉴 객체 배열로 변환합니다.
const MENUS = Object.entries(MENU_GROUPS).flatMap(([category, names]) => names.map((name, index) => buildMenu(category, name, index)));

function pickRandom(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function weightedPick(items, recent = []) {
  if (!items.length) return null;

  const recentNames = recent.map((item) => item.name);

  // 최근 먹은 메뉴가 바로 또 나오지 않도록 가중치를 조절합니다.
  // 가장 최근 메뉴는 후보에서 제외하고, 최근 2~4번째 메뉴는 낮은 확률로만 나오게 합니다.
  const weighted = items.flatMap((item) => {
    const recentIndex = recentNames.indexOf(item.name);
    if (recentIndex === 0) return [];
    if (recentIndex > 0 && recentIndex < 4) return [item];
    return [item, item, item];
  });

  // 모든 후보가 최근 메뉴라 weighted가 비어도, 앱이 멈추지 않도록 원본 items에서 뽑습니다.
  return pickRandom(weighted.length ? weighted : items);
}

function shuffle(items) {
  // VS 모드에서 무작위 후보 2개를 뽑기 위해 배열 복사 후 섞습니다.
  // 원본 MENUS 배열을 직접 변형하지 않도록 [...items]를 사용합니다.
  return [...items].sort(() => Math.random() - 0.5);
}

function hasLocalStorage() {
  try {
    // 일부 렌더링 환경에서는 window/localStorage가 없거나 접근이 막힐 수 있습니다.
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function getRecent() {
  if (!hasLocalStorage()) return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    // 저장된 값이 배열이 아닌 경우를 방어합니다.
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // JSON 파싱 실패 시 앱이 깨지지 않도록 빈 기록으로 복구합니다.
    return [];
  }
}

function saveRecent(menu) {
  const next = [
    // 최신 확정 메뉴를 맨 앞에 추가합니다.
    { ...menu, at: new Date().toISOString() },
    // 같은 메뉴가 기존 기록에 있으면 제거해서 중복 기록을 막습니다.
    ...getRecent().filter((item) => item.name !== menu.name)
  ].slice(0, 8); // 최근 기록은 UI가 길어지지 않도록 8개까지만 유지합니다.

  if (hasLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return next;
}

function runTests() {
  // 간단한 런타임 테스트입니다. 개발 중 데이터/헬퍼 함수가 깨졌는지 콘솔에서 바로 확인할 수 있습니다.
  console.assert(pickRandom([]) === null, "[test] empty pick should return null");
  console.assert(weightedPick([]) === null, "[test] empty weighted pick should return null");
  console.assert(shuffle([1, 2, 3]).length === 3, "[test] shuffle should preserve length");
  console.assert(MENUS.length >= 80, "[test] menu pool should be large enough");
  console.assert(MENUS.every((menu) => menu.name && menu.emoji && menu.category && menu.price), "[test] each menu needs required fields");
  console.assert(!CATEGORIES.includes("아시안"), "[test] categories should not include Asian");
  console.assert(!CATEGORIES.includes("카페"), "[test] categories should not include cafe");
  console.assert(CATEGORIES.includes("패스트푸드"), "[test] categories should include fast food");
  console.assert(buildMenu("한식", "김치찌개", 0).tags.includes("국물"), "[test] soup menu should get soup tag");
  console.assert(buildMenu("분식", "김밥", 0).price === "저렴", "[test] cheap menu should get cheap price");

  // 추가 테스트: 추천 후보가 최근 기록만으로 모두 제거되는 상황에서도 결과가 나와야 합니다.
  const sample = [buildMenu("한식", "김치찌개", 0)];
  console.assert(weightedPick(sample, sample)?.name === "김치찌개", "[test] weighted pick should fall back when all items are recent");
}

runTests();

export default function LunchPickApp() {
  // 각 필터의 현재 선택 상태입니다.
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [price, setPrice] = useState("상관없음");

  // 사용자가 제외한 메뉴명 목록입니다. 추천 후보에서 제외됩니다.
  const [excluded, setExcluded] = useState([]);

  // result는 현재 추천 결과, vs는 VS 모드 후보 2개입니다.
  const [result, setResult] = useState(null);
  const [vs, setVs] = useState([]);

  // 최근 기록은 최초 렌더링 때 localStorage에서 한 번만 읽습니다.
  const [recent, setRecent] = useState(() => getRecent());
  const [toast, setToast] = useState("10초 안에 점심 결정하기");

  const filteredMenus = useMemo(() => {
    // 추천/VS에서 사용할 후보 목록입니다.
    // 필터 값이 바뀔 때만 다시 계산하게 useMemo로 감쌉니다.
    return MENUS.filter((menu) => {
      if (excluded.includes(menu.name)) return false;
      if (selectedCategories.length && !selectedCategories.includes(menu.category)) return false;
      if (price !== "상관없음" && menu.price !== price) return false;
      return true;
    });
  }, [selectedCategories, price, excluded]);

  const toggleCategory = (nextCategory) => {
    if (nextCategory === "전체") {
      setSelectedCategories([]);
      return;
    }

    setSelectedCategories((previous) =>
      previous.includes(nextCategory)
        ? previous.filter((item) => item !== nextCategory)
        : [...previous, nextCategory]
    );
  };

  const recommend = () => {
    const picked = weightedPick(filteredMenus, recent);

    if (!picked) {
      // 필터/제외 조건 때문에 후보가 0개일 때 사용자에게 복구 방법을 알려줍니다.
      setToast("조건이 너무 빡세요. 필터나 제외 목록을 줄여보세요.");
      setResult(null);
      setVs([]);
      return;
    }

    setResult(picked);
    setVs([]);
    setToast("오늘 점심 후보 등장!");
  };

  const confirmMenu = (menu) => {
    // 결정한 메뉴를 최근 기록에 저장하고 화면 상태도 동기화합니다.
    const next = saveRecent(menu);
    setRecent(next);
    setToast(`${menu.name} 기록 완료. 맛점하세요!`);
    setResult(null);
  };

  const excludeMenu = (menu) => {
    if (!menu) return;

    // Set으로 감싸 같은 메뉴가 제외 목록에 중복으로 들어가지 않게 합니다.
    setExcluded((previous) => [...new Set([...previous, menu.name])]);
    setResult(null);
    setVs([]);
    setToast(`${menu.name} 제외 완료`);
  };

  const makeVs = () => {
    const candidates = shuffle(filteredMenus).slice(0, 2);

    if (candidates.length < 2) {
      setToast("VS 모드를 하려면 후보가 최소 2개 필요해요.");
      return;
    }

    setVs(candidates);
    setResult(null);
    setToast("둘 중 하나만 고르세요.");
  };

  const resetFilters = () => {
    // 필터, 제외 목록, 현재 결과를 모두 초기 상태로 돌립니다.
    setSelectedCategories([]);
    setPrice("상관없음");
    setExcluded([]);
    setResult(null);
    setVs([]);
    setToast("초기화 완료");
  };

  return (
    <main className="min-h-screen bg-gray-100 text-gray-950 flex items-center justify-center p-4">
      <div className="relative w-full max-w-[460px] min-h-[820px] overflow-hidden rounded-[2.2rem] border border-gray-200 bg-white shadow-2xl">
        {/* 배경 장식용 radial gradient입니다. pointer-events-none으로 클릭을 방해하지 않습니다. */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_12%,rgba(255,214,102,.22),transparent_28%),radial-gradient(circle_at_84%_28%,rgba(255,111,97,.12),transparent_30%),radial-gradient(circle_at_50%_75%,rgba(112,99,255,.10),transparent_35%)]" />

        <div className="relative z-10 px-5 py-7">
          <Header />

          <section className="mt-6 rounded-[2rem] border border-gray-200 bg-gray-50 p-5 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">오늘 점심</p>
                <h1 className="mt-1 text-4xl font-black tracking-tight text-gray-950">뭐 먹지?</h1>
              </div>
              <motion.div
                // 히어로 이모지가 계속 살짝 흔들리며 서비스의 가벼운 분위기를 만듭니다.
                animate={{ rotate: [0, -7, 7, 0], y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2.8 }}
                className="flex h-20 w-20 items-center justify-center rounded-3xl bg-yellow-200 text-5xl shadow-[0_0_35px_rgba(250,204,21,.25)]"
              >
                🍱
              </motion.div>
            </div>

            <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">{toast}</div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <PrimaryButton onClick={recommend} className="col-span-2 h-14 text-lg">
                🎲 추천받기
              </PrimaryButton>
              <SecondaryButton onClick={makeVs}>⚔️ VS 모드</SecondaryButton>
              <SecondaryButton onClick={resetFilters}>↻ 초기화</SecondaryButton>
            </div>
          </section>

          <FilterSection
            selectedCategories={selectedCategories}
            toggleCategory={toggleCategory}
            price={price}
            setPrice={setPrice}
            count={filteredMenus.length}
          />

          <VsSection vs={vs} setResult={setResult} setVs={setVs} setToast={setToast} />
          <RecentSection recent={recent} setResult={setResult} />
          <ExcludedSection excluded={excluded} setExcluded={setExcluded} />
        </div>

        <ResultModal
          result={result}
          onClose={() => setResult(null)}
          onAgain={recommend}
          onConfirm={confirmMenu}
          onExclude={excludeMenu}
        />
      </div>
    </main>
  );
}

function ResultModal({ result, onClose, onAgain, onConfirm, onExclude }) {
  return (
    <AnimatePresence>
      {result ? (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            // 바깥 어두운 영역을 누르면 닫히고, 카드 내부 클릭은 닫힘 이벤트가 전파되지 않게 막습니다.
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="w-full rounded-[2rem] border border-gray-200 bg-white p-5 text-center shadow-2xl"
          >
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-yellow-100 text-7xl shadow-[0_0_45px_rgba(250,204,21,.18)]">
              {result.emoji}
            </div>
            <div className="text-sm font-semibold text-yellow-700">오늘의 추천</div>
            <div className="mt-2 text-4xl font-black tracking-tight text-gray-950">{result.name}</div>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-gray-600">
              <Badge>{result.category}</Badge>
              <Badge>{result.price}</Badge>
              {result.tags.slice(0, 3).map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2">
              <SecondaryButton onClick={onAgain}>다시</SecondaryButton>
              <PrimaryButton onClick={() => onConfirm(result)}>결정</PrimaryButton>
              <DangerButton onClick={() => onExclude(result)}>제외</DangerButton>
            </div>
            <button type="button" onClick={onClose} className="mt-4 text-xs text-gray-500 underline">
              닫기
            </button>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function VsSection({ vs, setResult, setVs, setToast }) {
  return (
    <AnimatePresence mode="wait">
      {vs.length === 2 ? (
        <motion.section
          key="vs"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="mt-5 rounded-[2rem] border border-gray-200 bg-gray-50 p-4"
        >
          <div className="mb-3 text-center text-sm text-gray-500">둘 중 하나만 고르기</div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <button
              type="button"
              onClick={() => chooseVs(vs[0], setResult, setVs, setToast)}
              className="rounded-3xl bg-white p-4 text-center shadow-sm transition hover:bg-yellow-50 active:scale-95"
            >
              <div className="text-5xl">{vs[0].emoji}</div>
              <div className="mt-2 font-bold text-gray-900">{vs[0].name}</div>
            </button>
            <div className="text-sm font-black text-yellow-600">VS</div>
            <button
              type="button"
              onClick={() => chooseVs(vs[1], setResult, setVs, setToast)}
              className="rounded-3xl bg-white p-4 text-center shadow-sm transition hover:bg-yellow-50 active:scale-95"
            >
              <div className="text-5xl">{vs[1].emoji}</div>
              <div className="mt-2 font-bold text-gray-900">{vs[1].name}</div>
            </button>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}

function chooseVs(menu, setResult, setVs, setToast) {
  // VS 후보 중 하나를 고르면 일반 추천 결과 카드로 넘깁니다.
  setResult(menu);
  setVs([]);
  setToast(`${menu.name} 선택!`);
}

function Header() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-100 text-2xl">🍽️</div>
        <div>
          <div className="font-black text-gray-950">점메추</div>
          <div className="text-xs text-gray-500">LunchPick</div>
        </div>
      </div>
      <div className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">offline ready</div>
    </div>
  );
}

function FilterSection({ selectedCategories, toggleCategory, price, setPrice, count }) {
  return (
    <section className="mt-5 rounded-[2rem] border border-gray-200 bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold text-gray-950">조건 고르기</h2>
        <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-600 shadow-sm">후보 {count}개</span>
      </div>
      <FilterRow title="종류" options={CATEGORIES} value={selectedCategories} onChange={toggleCategory} multiple />
      <FilterRow title="가격" options={PRICES} value={price} onChange={setPrice} />
    </section>
  );
}

function FilterRow({ title, options, value, onChange, multiple = false }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 text-xs font-semibold text-gray-500">{title}</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {options.map((option) => {
          const isSelected = multiple
            ? option === "전체"
              ? value.length === 0
              : value.includes(option)
            : value === option;
          return (
            <button
              type="button"
              key={option}
              onClick={() => onChange(option)}
              // 선택된 필터는 노란색, 선택되지 않은 필터는 밝은 칩으로 보여줍니다.
              className={`shrink-0 rounded-full px-3 py-2 text-sm transition ${
                isSelected ? "bg-yellow-200 text-gray-950" : "bg-white text-gray-600 shadow-sm hover:bg-yellow-50"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecentSection({ recent, setResult }) {
  if (!recent.length) {
    return <section className="mt-5 rounded-[2rem] border border-dashed border-gray-200 bg-white/60 p-5 text-center text-sm text-gray-500">아직 먹은 기록이 없어요.</section>;
  }

  return (
    <section className="mt-5 rounded-[2rem] border border-gray-200 bg-gray-50 p-4">
      <h2 className="mb-3 font-bold text-gray-950">최근 먹은 메뉴</h2>
      <div className="grid grid-cols-2 gap-2">
        {recent.slice(0, 4).map((menu) => (
          <button
            type="button"
            key={menu.id || menu.name}
            // 최근 기록을 누르면 다시 결과 카드에 띄워 재선택할 수 있게 합니다.
            onClick={() => setResult(menu)}
            className="rounded-2xl bg-white px-3 py-3 text-left shadow-sm transition hover:bg-yellow-50"
          >
            <span className="mr-2">{menu.emoji}</span>
            <span className="text-sm font-medium text-gray-900">{menu.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ExcludedSection({ excluded, setExcluded }) {
  if (!excluded.length) return null;

  return (
    <section className="mt-5 rounded-[2rem] border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-gray-950">제외한 메뉴</h2>
        <button type="button" onClick={() => setExcluded([])} className="text-xs text-gray-500 underline">
          전체 해제
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {excluded.map((name) => (
          <button
            type="button"
            key={name}
            // 제외 칩을 누르면 해당 메뉴만 제외 목록에서 제거됩니다.
            onClick={() => setExcluded((previous) => previous.filter((item) => item !== name))}
            className="rounded-full bg-red-50 px-3 py-2 text-xs text-red-600 hover:bg-red-100"
          >
            {name} ×
          </button>
        ))}
      </div>
    </section>
  );
}

function Badge({ children }) {
  return <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">{children}</span>;
}

function PrimaryButton({ children, onClick, className = "" }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl bg-yellow-300 px-4 py-3 font-black text-gray-950 transition hover:bg-yellow-200 active:scale-95 ${className}`}>
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, className = "" }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl bg-white px-4 py-3 font-bold text-gray-800 shadow-sm transition hover:bg-yellow-50 active:scale-95 ${className}`}>
      {children}
    </button>
  );
}

function DangerButton({ children, onClick, className = "" }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-600 transition hover:bg-red-100 active:scale-95 ${className}`}>
      {children}
    </button>
  );
}
