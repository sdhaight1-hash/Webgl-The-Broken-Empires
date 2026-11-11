/** A short index of names from the user-provided personal SRD (source PDF
 * pp. 44-57). Names are navigation aids, NOT implemented Talent effects.
 * All prerequisites, XP costs and mechanics must be checked in the source PDF.
 */
export const TALENT_GROUPS={
  Combat:{
    44:['Armor Piercer','Find the Gap','Armor Training I–IV'],
    45:['Assassin','Catch and Release','Cloak and Blade','Close the Distance','Drop Attack','Enhanced Defense','Fast Runner','Fast Skirmisher'],
    46:['Feint','Improved Feint','Forceful Shot','Full Quiver','Hard-Headed','Hold the Line','Impaired Fighter (Arm)','Impaired Fighter (Leg)','Large Shield'],
    47:['Quickdraw','Rapid Fire','Riposte','Run for Your Life!','Shield Wall','Speed-Loader','Sweeping Attack','Tactical Advance']
  },
  'Combat Maneuver':{
    48:['Bullrush','Disarming Hit','Drop. Your. Sword.','Leg Sweeper','Precise Strike','Shield Breaker','Shield Maneuver','Subjugating Words','Slippery','Stable Stance']
  },
  Adventuring:{
    49:['Anti-Venom Blood','Careful Rationing','Ease of Passage','Quick and Quiet','Ride Like the Wind',"Ship’s Gunner"]
  },
  Social:{
    50:['Allow Me to Introduce...','Barbed Tongue','Entertaining','Expressive','Fiery Words','Inspirational'],
    51:['Natural Politician','Press the Point','Rally the Troops','Storm the Decks']
  },
  Lore:{
    51:['Battlefield Tactics'],
    52:['Bedside Manner',"It's All in the Mold",'Kingsfoil','Natural Remedies','Travel Planner']
  },
  Magic:{
    53:['Weapon of Faith','Divine Conduit','Enduring Caster (Bind)','Faded Pattern'],
    54:['Forceful Strand (Strand)','Patterned in the Weave','Unerring Bolt (Strand)','Weave Resistant (Choose)']
  },
  Miscellaneous:{
    55:["Cat’s Fall",'Fast Healer','Grit (Location)','I Have Just the Thing','Inner Strength','Not Today, Death','Strong Immune System','Unkillable']
  },
  'Non-Human':{
    56:['Blood-Fury','Dwarven Swordsinger','Whispered Inheritance'],
    57:['Hunted by the Queen']
  }
} as const;
export type TalentCategory=keyof typeof TALENT_GROUPS;
export type TalentOption={name:string;category:TalentCategory;page:number};
export const TALENT_CATALOG:TalentOption[]=Object.entries(TALENT_GROUPS).flatMap(([group,pages])=>
  Object.entries(pages).flatMap(([page,names])=>(names as readonly string[]).map(name=>
    ({name,category:group as TalentCategory,page:Number(page)}))));
/** Index labels whose spelling/variant grouping did not match an exact source
 * text substring in the initial audit. They remain manually selectable. */
export const TALENT_NAMES_PENDING_VERIFICATION=new Set([
  'Armor Training I–IV','Impaired Fighter (Arm)','Impaired Fighter (Leg)'
]);
export const TALENT_CATEGORIES=Object.keys(TALENT_GROUPS) as TalentCategory[];
export function findTalent(name:string):TalentOption|undefined{
  return TALENT_CATALOG.find(t=>t.name.toLocaleLowerCase()===name.trim().toLocaleLowerCase());
}
export const PREVIOUS_CAREERS=['Warrior','Rogue','Ranger','Bard','Civilian','Merchant','Godbound','Spellweaver'] as const;
export const WEAPON_NAMES=[
  'Dagger','Shortsword','Longsword','Two-handed sword','Battle-Axe','Hand axe',
  'Mace','Warhammer','Flail','Heavy Flail','Spear','Longspear','Halberd','Maul',
  'War Staff','Lance','Shortbow','Longbow','Crossbow','Throwing knife'
] as const;
