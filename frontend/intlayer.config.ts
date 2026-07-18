import { Locales, type IntlayerConfig } from "intlayer";

// The most common languages of the world, covering the top languages by
// native + total speakers (English, Mandarin, Hindi, Spanish, French,
// Arabic, Bengali, Portuguese, Russian, Urdu, Indonesian, German, Japanese,
// Swahili — the latter also a natural fit given Yotweek's East African
// events/tourism footprint — Korean, and Italian).
const config: IntlayerConfig = {
  internationalization: {
    locales: [
      Locales.ENGLISH,
      Locales.CHINESE,
      Locales.HINDI,
      Locales.SPANISH,
      Locales.FRENCH,
      Locales.ARABIC,
      Locales.BENGALI,
      Locales.PORTUGUESE,
      Locales.RUSSIAN,
      Locales.URDU,
      Locales.INDONESIAN,
      Locales.GERMAN,
      Locales.JAPANESE,
      Locales.SWAHILI,
      Locales.KOREAN,
      Locales.ITALIAN,
    ],
    defaultLocale: Locales.ENGLISH,
  },
  // No /en, /fr, /... URL prefix — this app already has a large, established
  // route tree (events, businesses, communities, const/*, etc.). Restructuring
  // every route under a [locale] segment would be a much bigger, riskier
  // migration than this task calls for. Locale is detected/stored via
  // cookie + Accept-Language header instead (see src/proxy.ts).
  routing: {
    mode: "no-prefix",
  },
};

export default config;
