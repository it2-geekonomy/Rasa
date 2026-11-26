export const EVENT_CATEGORIES = [
  'Performance',
  'Workshop',
  'Wellness',
  'Art',
  'Food',
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];
