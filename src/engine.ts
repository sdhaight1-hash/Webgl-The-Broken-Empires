import type { Character, Check } from './types.ts';
import {DEFAULT_ATTRIBUTES,DEFAULT_SUPPLIES,isSheetAttributes,isSheetSupplies} from './characterSheetState.ts';
import {isTbeSheet} from './tbeSheetData.ts';

const id = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const freshId = id;

export function makeCharacter(): Character {
  const now = new Date().toISOString();
  return { id: id(), name: '', pronouns: '', heritage: '', culture: '', career: '', description: '', goal: '', bond: '', history: '', status: '', notes: '', experience: '', skills: [], attributes:{...DEFAULT_ATTRIBUTES}, supplies:{...DEFAULT_SUPPLIES}, talents: [], expertise: [], wounds: [], equipment: [], events: [], createdAt: now, updatedAt: now };
}

/** PDF p. 23: an exact modified-target roll is critical; 99–100 always fail. Ratings above 100 are out of scope for this lab. */
export function resolveCheck(roll: number, target: number): Check {
  if (!Number.isInteger(roll) || roll < 1 || roll > 100) throw new RangeError('Percentile roll must be 1–100');
  if (!Number.isFinite(target) || target < 0 || target > 100) throw new RangeError('This basic dice lab accepts target values 0–100');
  const automaticSuccess = roll <= 5;
  const automaticFailure = roll >= 99;
  const success = !automaticFailure && (automaticSuccess || roll <= target);
  const double = roll === 100 || roll % 11 === 0;
  // An exact modified-target success is critical. An automatic failure that does
  // not exceed the target is not critical, even when the dice show doubles.
  const critical = success ? (double || roll === target) : (double && roll > target);
  // A natural roll of 01–09 gives at least 1 SL on success.
  const levels = success ? Math.max(1, Math.floor(roll / 10)) + (critical ? 3 : 0) : 0;
  const note = critical ? (success ? 'Critical success · +3 SL' : 'Critical failure') : automaticSuccess ? 'Automatic success' : automaticFailure ? 'Automatic failure' : success ? 'Successful check' : 'Unsuccessful check';
  return { roll, target, success, critical, levels, automatic: automaticSuccess || automaticFailure, note };
}

export function rollPercentile(): number {
  // Rejection sampling prevents modulo bias over the 16-bit range.
  const buffer = new Uint16Array(1);
  do { crypto.getRandomValues(buffer); } while (buffer[0] >= 65500);
  return (buffer[0] % 100) + 1;
}

export function isCharacter(value: unknown): value is Character {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<Character>;
  return ['id','name','pronouns','heritage','culture','career','description','goal','bond','history','status','notes','experience','createdAt','updatedAt'].every(k => typeof c[k as keyof Character] === 'string') && Array.isArray(c.skills) && c.skills.every(s => s && typeof s.id === 'string' && typeof s.name === 'string' && typeof s.note === 'string' && Number.isFinite(s.rating) && s.rating >= 0 && s.rating <= 100 &&
    (s.modifier===undefined||(Number.isInteger(s.modifier)&&s.modifier>=-100&&s.modifier<=100)) &&
    (s.expertiseLevel===undefined||[1,2,3,4].includes(s.expertiseLevel))) &&
    (c.attributes===undefined||isSheetAttributes(c.attributes)) &&
    (c.supplies===undefined||isSheetSupplies(c.supplies)) &&
    (c.tbeSheet===undefined||isTbeSheet(c.tbeSheet)) && ['talents','expertise','wounds','equipment','events'].every(k => Array.isArray(c[k as keyof Character]) && (c[k as keyof Character] as unknown[]).every(entry => !!entry && typeof entry === 'object' && typeof (entry as Record<string,unknown>).id === 'string' && typeof (entry as Record<string,unknown>).text === 'string'));
}

export function safeReadRoster(raw: string | null): Character[] {
  if (!raw) return [];
  try { const parsed: unknown = JSON.parse(raw); return Array.isArray(parsed) ? parsed.filter(isCharacter).slice(0, 200) : []; }
  catch { return []; }
}
