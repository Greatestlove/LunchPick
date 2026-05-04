import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Beef,
  Bookmark,
  Check,
  ChefHat,
  Clock3,
  Heart,
  RotateCw,
  Search,
  Shuffle,
  SlidersHorizontal,
  Soup,
  Sparkles,
  Star,
  Utensils,
  X,
} from "lucide-react";

const RECENT_KEY = "lunchpick_recent_v1";
const FAVORITES_KEY = "lunchpick_favorites_v1";

const menus = [
  { name: "김치찌개", category: "한식", price: "보통", mood: ["뜨끈한", "든든한"], tags: ["국물", "밥"] },
  { name: "제육볶음", category: "한식", price: "보통", mood: ["매콤한", "든든한"], tags: ["밥", "고기"] },
  { name: "비빔밥", category: "한식", price: "가벼운", mood: ["깔끔한", "든든한"], tags: ["채소", "밥"] },
  { name: "냉면", category: "한식", price: "보통", mood: ["시원한", "깔끔한"], tags: ["면", "여름"] },
  { name: "짜장면", category: "중식", price: "가벼운", mood: ["빠른", "든든한"], tags: ["면"] },
  { name: "마라탕", category: "중식", price: "보통", mood: ["매콤한", "뜨끈한"], tags: ["국물", "면"] },
  { name: "탕수육 정식", category: "중식", price: "비싼", mood: ["든든한"], tags: ["고기", "튀김"] },
  { name: "돈카츠", category: "일식", price: "보통", mood: ["바삭한", "든든한"], tags: ["튀김", "밥"] },
  { name: "초밥", category: "일식", price: "비싼", mood: ["깔끔한", "특별한"], tags: ["해산물"] },
  { name: "우동", category: "일식", price: "가벼운", mood: ["뜨끈한", "빠른"], tags: ["국물", "면"] },
  { name: "파스타", category: "양식", price: "보통", mood: ["부드러운", "특별한"], tags: ["면"] },
  { name: "리조또", category: "양식", price: "보통", mood: ["부드러운", "든든한"], tags: ["밥"] },
  { name: "스테이크 덮밥", category: "양식", price: "비싼", mood: ["특별한", "든든한"], tags: ["고기", "밥"] },
  { name: "떡볶이", category: "분식", price: "가벼운", mood: ["매콤한", "빠른"], tags: ["간식"] },
  { name: "김밥", category: "분식", price: "가벼운", mood: ["빠른", "깔끔한"], tags: ["밥"] },
  { name: "라면", category: "분식", price: "가벼운", mood: ["뜨끈한", "빠른"], tags: ["국물", "면"] },
  { name: "수제버거", category: "패스트푸드", price: "보통", mood: ["든든한", "특별한"], tags: ["고기"] },
  { name: "치킨 샐러드", category: "샐러드", price: "보통", mood: ["가벼운", "깔끔한"], tags: ["채소", "단백질"] },
  { name: "포케", category: "샐러드", price: "보통", mood: ["가벼운", "깔끔한"], tags: ["밥", "채소"] },
  { name: "부리또", category: "세계음식", price: "보통", mood: ["든든한", "빠른"], tags: ["고기", "채소"] },
];

const categoryIcons = {
  한식: Soup,
  중식: Beef,
  일식: ChefHat,
  양식: Utensils,
  분식: Sparkles,
  패스트푸드: Star,
  샐러드: Heart,
  세계음식: Bookmark,
};

const categories = ["전체", ...Array.from(new Set(menus.map((menu) => menu.category)))];
const moods = ["상관없음", "든든한", "가벼운", "매콤한", "뜨끈한", "깔끔한", "빠른", "특별한"];
const prices = ["상관없음", "가벼운", "보통", "비싼"];

function readList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function saveList(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export default function App() {
  const [category, setCategory] = useState("전체");
  const [mood, setMood] = useState("상관없음");
  const [price, setPrice] = useState("상관없음");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => pickRandom(menus));
  const [recent, setRecent] = useState(() => readList(RECENT_KEY));
  const [favorites, setFavorites] = useState(() => readList(FAVORITES_KEY));

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return menus.filter((menu) => {
      const matchesCategory = category === "전체" || menu.category === category;
      const matchesMood = mood === "상관없음" || menu.mood.includes(mood);
      const matchesPrice = price === "상관없음" || menu.price === price;
      const matchesQuery =
        !trimmed ||
        [menu.name, menu.category, menu.price, ...menu.mood, ...menu.tags]
          .join(" ")
          .toLowerCase()
          .includes(trimmed);

      return matchesCategory && matchesMood && matchesPrice && matchesQuery;
    });
  }, [category, mood, price, query]);

  const isFavorite = favorites.includes(selected.name);

  function choose(menu = pickRandom(filtered.length ? filtered : menus)) {
    setSelected(menu);
    const nextRecent = [menu.name, ...recent.filter((item) => item !== menu.name)].slice(0, 6);
    setRecent(nextRecent);
    saveList(RECENT_KEY, nextRecent);
  }

  function toggleFavorite(menuName) {
    const nextFavorites = favorites.includes(menuName)
      ? favorites.filter((item) => item !== menuName)
      : [menuName, ...favorites].slice(0, 12);
    setFavorites(nextFavorites);
    saveList(FAVORITES_KEY, nextFavorites);
  }

  function resetFilters() {
    setCategory("전체");
    setMood("상관없음");
    setPrice("상관없음");
    setQuery("");
  }

  const Icon = categoryIcons[selected.category] || Utensils;

  return (
    <main className="app-shell">
      <section className="picker">
        <div className="topbar">
          <div className="brand">
            <span className="brand-mark">
              <Utensils size={22} aria-hidden="true" />
            </span>
            <span>LunchPick</span>
          </div>
          <button className="icon-button" type="button" onClick={resetFilters} aria-label="필터 초기화">
            <RotateCw size={19} aria-hidden="true" />
          </button>
        </div>

        <div className="result-panel">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.name}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              className="result-card"
            >
              <div className="result-icon">
                <Icon size={42} aria-hidden="true" />
              </div>
              <div>
                <p className="eyebrow">{selected.category} · {selected.price}</p>
                <h1>{selected.name}</h1>
                <div className="chips">
                  {selected.mood.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="actions">
            <button className="primary-button" type="button" onClick={() => choose()}>
              <Shuffle size={20} aria-hidden="true" />
              추천 받기
            </button>
            <button
              className={isFavorite ? "icon-button active" : "icon-button"}
              type="button"
              onClick={() => toggleFavorite(selected.name)}
              aria-label="즐겨찾기"
            >
              <Heart size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        <section className="filters" aria-label="메뉴 필터">
          <div className="search-field">
            <Search size={18} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="메뉴, 태그 검색"
              aria-label="메뉴 검색"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="검색어 지우기">
                <X size={17} aria-hidden="true" />
              </button>
            )}
          </div>

          <FilterGroup icon={SlidersHorizontal} label="종류" items={categories} value={category} onChange={setCategory} />
          <FilterGroup label="기분" items={moods} value={mood} onChange={setMood} />
          <FilterGroup label="가격" items={prices} value={price} onChange={setPrice} />
        </section>
      </section>

      <aside className="side-panel">
        <Summary count={filtered.length} onPick={() => choose()} />
        <MenuList title="추천 후보" items={filtered} favorites={favorites} onPick={choose} onFavorite={toggleFavorite} />
        <SavedList title="최근 선택" icon={Clock3} names={recent} />
        <SavedList title="즐겨찾기" icon={Heart} names={favorites} />
      </aside>
    </main>
  );
}

function FilterGroup({ icon: Icon, label, items, value, onChange }) {
  return (
    <div className="filter-group">
      <div className="filter-label">
        {Icon && <Icon size={16} aria-hidden="true" />}
        <span>{label}</span>
      </div>
      <div className="segment-list">
        {items.map((item) => (
          <button
            key={item}
            className={value === item ? "segment selected" : "segment"}
            type="button"
            onClick={() => onChange(item)}
          >
            {value === item && <Check size={14} aria-hidden="true" />}
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function Summary({ count, onPick }) {
  return (
    <section className="summary">
      <div>
        <p>현재 후보</p>
        <strong>{count || 0}</strong>
      </div>
      <button className="compact-button" type="button" onClick={onPick}>
        <Shuffle size={17} aria-hidden="true" />
        하나 고르기
      </button>
    </section>
  );
}

function MenuList({ title, items, favorites, onPick, onFavorite }) {
  return (
    <section className="list-section">
      <h2>{title}</h2>
      <div className="menu-grid">
        {(items.length ? items : menus).slice(0, 8).map((menu) => (
          <article className="menu-card" key={menu.name}>
            <button className="menu-main" type="button" onClick={() => onPick(menu)}>
              <span>{menu.name}</span>
              <small>{menu.category} · {menu.price}</small>
            </button>
            <button
              className={favorites.includes(menu.name) ? "mini-button active" : "mini-button"}
              type="button"
              onClick={() => onFavorite(menu.name)}
              aria-label={`${menu.name} 즐겨찾기`}
            >
              <Heart size={16} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function SavedList({ title, icon: Icon, names }) {
  return (
    <section className="saved-section">
      <h2>
        <Icon size={17} aria-hidden="true" />
        {title}
      </h2>
      {names.length ? (
        <div className="saved-items">
          {names.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      ) : (
        <p className="empty">아직 저장된 메뉴가 없습니다.</p>
      )}
    </section>
  );
}
