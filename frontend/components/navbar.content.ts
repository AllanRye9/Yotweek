import { t, type Dictionary } from "intlayer";

const navbarContent = {
  key: "navbar",
  content: {
    tagline: t({
      en: "Discover · Explore",
      zh: "发现 · 探索",
      hi: "जानें · घूमें",
      es: "Descubre · Explora",
      fr: "Découvrir · Explorer",
      ar: "اكتشف · استكشف",
      bn: "আবিষ্কার · অন্বেষণ",
      pt: "Descubra · Explore",
      ru: "Открывай · Исследуй",
      ur: "دریافت کریں · تلاش کریں",
      id: "Temukan · Jelajahi",
      de: "Entdecken · Erkunden",
      ja: "発見 · 探検",
      sw: "Gundua · Chunguza",
      ko: "발견 · 탐험",
      it: "Scopri · Esplora",
    }),
  },
} satisfies Dictionary;

export default navbarContent;
