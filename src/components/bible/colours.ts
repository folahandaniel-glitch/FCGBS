/** Colour themes shared by topics, plans, teaching tracks and cards (static class names so Tailwind keeps them). */
export const COLOUR: Record<string, { grad: string; soft: string; text: string; ring: string; dot: string; banner: "royal" | "emerald" | "violet" | "amber" | "rose" }> = {
  royal: { grad: "from-royal-500 to-navy-800", soft: "bg-royal-50", text: "text-royal-700", ring: "ring-royal-200", dot: "bg-royal-500", banner: "royal" },
  gold: { grad: "from-gold-500 to-amber-700", soft: "bg-gold-50", text: "text-gold-600", ring: "ring-gold-400/40", dot: "bg-gold-500", banner: "amber" },
  amber: { grad: "from-amber-500 to-orange-700", soft: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", dot: "bg-amber-500", banner: "amber" },
  emerald: { grad: "from-emerald-500 to-teal-700", soft: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500", banner: "emerald" },
  teal: { grad: "from-teal-500 to-cyan-700", soft: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-200", dot: "bg-teal-500", banner: "emerald" },
  violet: { grad: "from-violet-500 to-violet-800", soft: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200", dot: "bg-violet-500", banner: "violet" },
  rose: { grad: "from-rose-500 to-rose-800", soft: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200", dot: "bg-rose-500", banner: "rose" },
  sky: { grad: "from-sky-500 to-royal-700", soft: "bg-sky-50", text: "text-sky-700", ring: "ring-sky-200", dot: "bg-sky-500", banner: "royal" },
};
export const COLOUR_KEYS = Object.keys(COLOUR);
