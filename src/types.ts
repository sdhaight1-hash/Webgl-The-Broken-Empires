export interface Skill { id: string; name: string; rating: number; note: string; modifier?: number; expertiseLevel?: 1 | 2 | 3 | 4 }

/** Core rulebook, PDF pp. 91-92. Optional for previously saved characters. */
export interface SheetAttributes {
  resolvePoints: number;
  initiativePoints: number;
  toughnessPoints: number;
  deathThresholdPoints: number;
  resolveBonus: number;
  initiativeBonus: number;
  toughnessBonus: number;
  deathThresholdBonus: number;
  lethalityBonus: number;
  armorInitiativePenalty: number;
  spentResolve: number;
  fatigue: number;
}
export type SupplyDieSize = 0 | 6 | 8 | 10 | 12;
export type SupplyCategory = 'gear' | 'ammo' | 'medical' | 'rations';
export type SheetSupplies = Record<SupplyCategory, SupplyDieSize | null>;
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
  attributes?: SheetAttributes;
  supplies?: SheetSupplies;
  talents: RecordEntry[];
  expertise: RecordEntry[];
  wounds: RecordEntry[];
  equipment: RecordEntry[];
  events: RecordEntry[];
  createdAt: string;
  updatedAt: string;
}
export type Page = 'overview' | 'forge' | 'sheet' | 'codex' | 'srd' | 'solo' | 'references' | 'dice';
export type Check = { roll: number; target: number; success: boolean; critical: boolean; levels: number; automatic: boolean; note: string };
export interface RuleArticle { id: string; title: string; category: string; summary: string; details: string[]; page: number; source: string; sourceTitle: string; status: 'core-rulebook' | 'verified-overview' | 'secondary-source' | 'pending-core-book'; example?: { situation: string; takeaway: string }; quiz?: { question: string; options: string[]; correct: number; explanation: string }; }
