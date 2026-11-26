export type DayId = "fri" | "sat" | "sun";

export type Day = {
  id: DayId;
  short: string;
  num: string;
  long: string;
  title: string;
  cls: string;
  info: string;
  pts: string[];
};

export type EventType = "perf" | "work" | "well" | "art" | "brk";

export type FestivalEvent = {
  id: string;
  d: DayId;
  s: number;
  e: number;
  ty: EventType;
  t: string;
  w?: string;
  v?: string;
  x?: string;
  a?: string[];
  ws?: number;
  o?: number;
  nt?: number;
  tl?: string;
  ts?: string;
  dl?: string;
  pair?: string;
  price?: string;
  seats?: string;
  pic?: string;
  pp?: string;
  palt?: string;
  img?: string[];
  imgalt?: string[];
};

export type ArtistContact = {
  ig?: string;
  ig2?: string;
  web?: string;
  ph?: string;
  phl?: string;
  em?: string;
};

export type Artist = {
  id: string;
  n: string;
  r: string;
  c: string;
  img: string[];
  pos?: string;
  land?: number;
  ev?: string[];
  bio: string[];
  ct?: ArtistContact;
  cred?: string;
  altn?: string;
  logo?: { img: string; href: string; alt: string };
};

export type SoonArtist = [
  string,
  string,
  string,
  string?,
  string?,
  string?,
];