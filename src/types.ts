export interface Skill { id: string; name: string; rating: number; note: string }
export interface RecordEntry { id: string; text: string }
export interface Character {
  id: string;
  name: string;
  pronouns: string;
  heritage: string;
  culture: string;
  career: string;
  description: string;
  goal: string;
  bond: string;
  history: string;
  status: string;
  notes: string;
  experience: string;
  skills: Skill[];
  talents: RecordEntry[];
  expertise: RecordEntry[];
  wounds: RecordEntry[];
  equipment: RecordEntry[];
  events: RecordEntry[];
  createdAt: string;
  updatedAt: string;
}
export type Page = 'overview' | 'forge' | 'sheet' | 'codex' | 'references' | 'dice';
export type Check = { roll: number; target: number; success: boolean; critical: boolean; levels: number; automatic: boolean; note: string };
export interface RuleArticle { id: string; title: string; category: string; summary: string; details: string[]; page: number; source: string; sourceTitle: string; status: 'core-rulebook' | 'verified-overview' | 'secondary-source' | 'pending-core-book'; example?: { situation: string; takeaway: string }; quiz?: { question: string; options: string[]; correct: number; explanation: string }; }
