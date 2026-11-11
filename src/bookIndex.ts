/** Page positions verified against the 663-page user-supplied PDF's embedded bookmarks.
 * Page numbers are PDF viewer page numbers (1-based), not printed folios.
 * This is an index, not a reproduction or an implementation of copyrighted tables.
 */
export interface BookLink { title: string; page: number; group: string }
export const BOOK_LINKS: BookLink[] = [
  {group:'Foundations',title:'Core Mechanics',page:20},
  {group:'Foundations',title:'Skill Modifiers',page:22},
  {group:'Foundations',title:'Success Levels and Critical Results',page:23},
  {group:'Foundations',title:'Standard and Opposed Rolls',page:24},
  {group:'Foundations',title:'Extended Rolls',page:26},
  {group:'Foundations',title:'Favor and Resolve',page:30},
  {group:'Characters',title:'Skills',page:32},
  {group:'Characters',title:'Talents',page:42},
  {group:'Characters',title:'Expertise',page:58},
  {group:'Characters',title:'Peoples',page:60},
  {group:'Characters',title:'Goals',page:74},
  {group:'Characters',title:'Character Creation',page:82},
  {group:'Characters',title:'Experience and Advancement',page:124},
  {group:'Conflict & Journey',title:'Equipment',page:130},
  {group:'Conflict & Journey',title:'Combat',page:150},
  {group:'Conflict & Journey',title:'Wounds and Healing',page:174},
  {group:'Conflict & Journey',title:'Travel',page:200},
  {group:'Conflict & Journey',title:'Intrigue',page:252},
  {group:'Magic',title:'Weave Magic',page:276},
  {group:'Magic',title:'Divine Magic',page:348},
  {group:'Setting & GM',title:'The Gods',page:370},
  {group:'Setting & GM',title:'Gamemastering',page:404},
  {group:'Setting & GM',title:'Bestiary',page:440},
];
export const CREATION_SEQUENCE = [
  {title:'Concept and initial skills',page:84},
  {title:'Race',page:85},
  {title:'Ability scores',page:90},
  {title:'Attributes',page:91},
  {title:'Cultural background',page:93},
  {title:'Life events',page:95},
  {title:'Previous career',page:106},
  {title:'Rounding out',page:112},
  {title:'Equipment',page:113},
  {title:'Personality traits',page:114},
  {title:'Character goals',page:115},
  {title:'Status (optional)',page:118},
];
export const ARTICLE_BOOK_PAGES: Record<string,number> = {
  overview:20,checks:23,opposed:24,origins:82,goals:115,
  combat:150,intrigue:252,travel:200,magic:276,status:118,
};
export const PDF_PAGE_COUNT = 663;
