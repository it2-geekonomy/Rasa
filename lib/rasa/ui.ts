/** Shared Tailwind class strings matching the handover design. */

export const wrap =
  "mx-auto max-w-[1240px] px-6 py-11 pb-14 max-md:px-4 max-md:py-8 max-md:pb-12";
export const wrapTight =
  "mx-auto max-w-[1240px] px-6 pt-7 pb-14 max-md:px-4 max-md:py-6 max-md:pb-12";

export const ph1 =
  "bg-plum text-white py-11 max-md:py-7 [&_h1]:text-white [&_h1]:text-[clamp(2rem,5vw,3.2rem)] [&_p]:text-[#eadcee] [&_p]:mt-2.5 [&_p]:max-w-[720px] [&_p]:text-[1.05rem]";
export const ph1In = "mx-auto max-w-[1240px] px-6 max-md:px-4";

export const card =
  "rounded-rasa border border-line bg-white p-[22px] max-md:rounded-xl max-md:p-3.5 [&_h3]:mb-1.5 [&_h3]:text-[1.25rem] [&_h3]:font-semibold [&_h3]:font-display [&_h3]:text-plum max-md:[&_h3]:text-[1.05rem] [&_p]:text-muted max-md:[&_p]:text-[0.88rem] max-md:[&_p]:leading-snug";

export const btn =
  "inline-flex min-h-[46px] items-center justify-center rounded-full bg-burg px-6 py-3 text-[0.95rem] font-bold text-white no-underline transition hover:bg-burg-d active:scale-[0.97] max-md:min-h-10 max-md:px-4 max-md:py-2 max-md:text-sm";
export const btnGhost =
  "inline-flex min-h-[46px] items-center justify-center rounded-full border-2 border-current bg-transparent px-6 py-3 text-[0.95rem] font-bold text-white no-underline max-md:min-h-10 max-md:px-4 max-md:py-2 max-md:text-sm";
export const btnLine =
  "inline-flex min-h-[46px] items-center justify-center rounded-full border-2 border-plum bg-white px-6 py-3 text-[0.95rem] font-bold text-plum no-underline max-md:min-h-10 max-md:px-4 max-md:py-2 max-md:text-sm";

export const lab =
  "font-lab text-[0.85rem] font-semibold tracking-[0.09em] uppercase";

export const lead = "mb-[22px] max-w-[68ch] text-[1.05rem] text-muted max-md:mb-4 max-md:text-[0.95rem] max-md:leading-relaxed";
export const note = "mt-3.5 max-w-[80ch] text-[0.9rem] text-muted";

export const lnk =
  "inline-flex min-h-11 items-center font-bold text-burg no-underline hover:underline";

export const grid2 = "grid grid-cols-2 items-stretch gap-[18px] max-md:grid-cols-1";
export const grid3 = "grid grid-cols-3 items-stretch gap-[18px] max-md:grid-cols-1";
export const grid4 =
  "grid grid-cols-4 items-stretch gap-[18px] max-md:grid-cols-2 max-[520px]:grid-cols-1";

/** Wrapper for animated grid cells — keeps row heights equal (handover layout). */
export const gridAnimItem = "h-full min-h-0";

export const chip =
  "min-h-11 rounded-full border-2 border-line bg-white px-4 py-2 font-medium";
export const chipOn =
  "min-h-11 rounded-full border-2 border-burg bg-burg px-4 py-2 font-bold text-white";

export const tab =
  "flex min-h-[58px] flex-col items-start rounded-xl border-2 border-line bg-white px-5 py-2.5 text-left";
export const tabOn =
  "flex min-h-[58px] flex-col items-start rounded-xl border-2 border-plum bg-plum px-5 py-2.5 text-left [&_small]:text-white [&_b]:text-white";