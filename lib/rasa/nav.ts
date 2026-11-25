export type NavGroup =
  | "home"
  | "festival"
  | "venue"
  | "booking"
  | "about"
  | "sponsors"
  | "partners"
  | "artists";

export const MAIN_LINKS: {
  group: NavGroup;
  href: string;
  label: string;
}[] = [
  { group: "home", href: "/", label: "Home" },
  { group: "festival", href: "/events", label: "Festival" },
  { group: "venue", href: "/venue", label: "Festival Venue" },
  { group: "booking", href: "/booking", label: "Tickets" },
  { group: "about", href: "/about", label: "About" },
  { group: "sponsors", href: "/sponsors", label: "Sponsors" },
  { group: "partners", href: "/partners", label: "Make a difference" },
];

export const SUB_NAV: Record<string, [string, string][]> = {
  festival: [
    ["events", "Programme"],
    ["workshops", "Workshops"],
    ["artists", "Artists"],
    ["exhibitions", "Art Exhibitions"],
    ["stalls", "Stalls"],
  ],
  booking: [
    ["booking", "Tickets"],
    ["faq", "FAQ and policies"],
  ],
  about: [
    ["about", "Why RASA"],
    ["team", "Team"],
  ],
};

export function groupForPath(pathname: string): NavGroup {
  if (pathname === "/" || pathname === "/home") return "home";
  if (pathname.startsWith("/venue")) return "venue";
  if (pathname.startsWith("/booking") || pathname.startsWith("/faq")) return "booking";
  if (pathname.startsWith("/about") || pathname.startsWith("/team")) return "about";
  if (pathname.startsWith("/sponsors")) return "sponsors";
  if (pathname.startsWith("/partners")) return "partners";
  if (pathname.startsWith("/artists")) return "artists";
  if (
    pathname.startsWith("/events") ||
    pathname.startsWith("/workshops") ||
    pathname.startsWith("/exhibitions") ||
    pathname.startsWith("/stalls")
  ) {
    return "festival";
  }
  return "festival";
}

export function subSlug(pathname: string): string {
  const base = pathname.replace(/^\//, "").split("/")[0] || "home";
  if (base === "events" && pathname.includes("/")) {
    return "events";
  }
  return base;
}