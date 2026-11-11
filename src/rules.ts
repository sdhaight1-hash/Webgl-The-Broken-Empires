import type { RuleArticle } from './types.ts';

export const OFFICIAL = 'https://thebrokenempiresrpg.com';
export const CHARACTER_SHEET = OFFICIAL + '/pages/character-sheets';
export const CORE_BOOK = OFFICIAL + '/products/the-broken-empires-rpg%C2%AE-core-rules-pdf';
export const LICENSE = OFFICIAL + '/pages/license';

export const HERITAGES = ['Human','Dwarf','Half-Orc','Ogre','Bolg Fiir','Replaced'];
// Representative named skills, verified on PDF pages 33–38; custom -wise and Languages are open-ended.
export const SUGGESTED_SKILLS = [
  'Athletics','Dodge','Endurance','Perception','Stealth','Survival','Track','Willpower',
  'Melee: Light','Melee: Medium','Melee: Heavy','Might','Missile','Thrown',
  'Locks & Traps','Ride','Sail/Boat','Sleight of Hand','Deceive','Insight','Inspire',
  'Intimidate','Perform','Persuade','Protocol','Seduce','Wit','Ancient Lore','Arcana',
  'Commerce','Common Lore','Craft: Artistic','Craft: Practical','Divinity','Heal',
  'Naturewise','Streetwise'
];

// Original instructional paraphrases of selected rulebook mechanics.
// Numbers identify one-based pages in the user's 663-page PDF, not printed page numbers.
// No proprietary tables, prose, or artwork are embedded here.
const seeds: Omit<RuleArticle, 'source' | 'sourceTitle' | 'status'>[] = [
  {
    id:'overview', title:'How the system thinks', category:'Foundations', page:20,
    summary:'A skill-first percentile game: describe a meaningful attempt, then roll only when the outcome is uncertain and failure matters.',
    details:[
      'A character advances through individual skills, Talents and goals rather than a class and level ladder.',
      'Roll when both success and failure are plausible and the consequence matters. Ordinary uncontested actions need not consume table time.',
      'The same success-level language links exploration, social contests, combat and spellcasting.'
    ],
    quiz:{ question:'Should a GM call for a roll when nothing meaningful happens on failure?', options:['Yes, for every action','No; describe the action and move on','Only during combat'], correct:1, explanation:'PDF pages 21 and 32 reserve rolling for uncertain actions with consequences.' }
  },
  {
    id:'checks', title:'Percentile skill checks', category:'Core resolution', page:21,
    summary:'Roll 1–100, usually succeed at or below the modified skill value, then use the tens digit to measure a successful result.',
    details:[
      'The two zero faces together represent 100, not zero. The normal check compares the die result to the adjusted skill.',
      'A success usually earns the number of tens shown on the die as Success Levels (SL); 01–09 successes still count as at least 1 SL.',
      'The basic roll laboratory supports skill targets from 0 to 100. See the special high-skill rule for ratings above 100.'
    ],
    example:{ situation:'Skill 65; roll 52.', takeaway:'The roll succeeds with 5 SL because it is at or under 65 and shows a tens digit of five.' },
    quiz:{ question:'You roll 06 against a skill of 65. How many SLs?', options:['0','1','6'], correct:1, explanation:'A successful roll with a zero tens die produces at least 1 SL (PDF p. 23).' }
  },
  {
    id:'modifiers', title:'Modifiers and Skill Score', category:'Core resolution', page:22,
    summary:'Modifiers change the roll-under target, but never change the skill’s unmodified Score.',
    details:[
      'A +10 modifier turns skill 63 into a 73 target; a -20 modifier turns skill 56 into 36.',
      'Score is the tens digit of the underlying skill value and remains fixed when temporary modifiers apply.',
      'Circumstantial modifiers add together. Avoid double-penalizing one condition with overlapping modifiers.',
      'GM difficulty modifiers are best used on standard tests; opposed rolls normally create their own difficulty.'
    ],
    quiz:{question:'Track 65 receives a +20 modifier. What is its Score?',options:['6','8','85'],correct:0,explanation:'The target becomes 85, but the Score remains 6 (PDF p. 22).'}
  },
  {
    id:'criticals', title:'Criticals and automatic outcomes', category:'Core resolution', page:23,
    summary:'A matching successful double or an exact roll of the skill value is critical; the lowest and highest dice carry special outcomes.',
    details:[
      'Rolling 01–05 succeeds even if the target would normally be too low; rolling 99–100 always fails.',
      'A successful double below the target, or rolling the exact modified skill value successfully, adds 3 SLs.',
      'Doubles above the modified target are critical failures. If a 99–100 roll does not exceed a very high skill, it is an automatic failure but not a critical failure.',
      'For skills above 100, the book adds additional SLs on successes and removes critical failures; the current dice lab does not model that advanced case.'
    ],
    example:{situation:'Modified skill 65; die shows 65.',takeaway:'This succeeds critically even though 65 is not a double: it matches the target exactly.'},
    quiz:{question:'Skill 65, roll 65. What happens?',options:['Ordinary success','Critical success','Failure'],correct:1,explanation:'The exact modified skill value is a critical success (PDF p. 23).'}
  },
  {
    id:'opposed', title:'Opposed tests and tie-breaks', category:'Core resolution', page:24,
    summary:'Two sides roll; compare success, SLs, critical status, the die result, and finally the adjusted skill if needed.',
    details:[
      'If only one participant succeeds, that participant wins. If both succeed, compare the number of SLs.',
      'When SLs tie, a critical success outranks a non-critical result. Otherwise the higher die result wins; a final identical result favors the higher modified skill.',
      'If both fail, normally neither wins. The GM decides outcomes for contests requiring an immediate winner.',
      'An opposed defense does not use up the defender’s normal turn action.'
    ],
    example:{situation:'Stealth 54 rolls 25; Perception 40 rolls 27.',takeaway:'Both receive 2 SL, so the higher successful die result (27) breaks the tie.'},
    quiz:{question:'Both sides succeed with 3 SL. Only one result is critical. Who wins?',options:['The critical result','The higher skill rating always','The attacker always'],correct:0,explanation:'The critical result wins a tied-SL opposed check (PDF p. 24).'}
  },
  {
    id:'degree', title:'Degree of Success (DoS)', category:'Core resolution', page:25,
    summary:'Some opposed tests care about the margin of victory: subtract the loser’s SLs from the winner’s.',
    details:[
      'DoS is the remaining margin after the winning side’s SLs are reduced by the opposing side’s SLs.',
      'A successful attack with 5 SL against a defense with 2 SL has 3 DoS.',
      'Only apply DoS when that specific rule or scene requires it; other contests use the binary winning result.',
      'Some hazards oppose a fixed number of SLs instead of a second rolled skill.'
    ],
    quiz:{question:'An attacker wins with 6 SL against a defender with 4 SL. What is the DoS?',options:['10','2','4'],correct:1,explanation:'The margin is 6 − 4 = 2 DoS (PDF p. 25).'}
  },
  {
    id:'extended', title:'Extended rolls', category:'Core resolution', page:26,
    summary:'Large projects accumulate SLs over repeated intervals until their goal or a limit is reached.',
    details:[
      'The GM defines the required total SLs and the time represented by each attempt; a maximum number of intervals and a minimum duration may also apply.',
      'Successful rolls add SLs to the running total. An ordinary failure adds nothing.',
      'A critical failure halves accumulated SLs, rounding up, after that interval is resolved.',
      'With multiple helpers, only the highest roll contributes its full SLs; up to two other successful helpers can each add 1 SL.'
    ],
    quiz:{question:'An extended task has accumulated 7 SL, then suffers a critical failure. What remains?',options:['0 SL','3 SL','4 SL'],correct:2,explanation:'Halve seven and round up to four (PDF p. 26).'}
  },
  {
    id:'timer', title:'Timer Die and escalating pressure', category:'Core resolution', page:29,
    summary:'A Timer Die can complicate or prematurely end an extended task as intervals pass.',
    details:[
      'Choose a die such as d10 and roll it after each interval.',
      'If its result is at or below the count of intervals elapsed, trigger the complication or end condition decided before the task began.',
      'Smaller Timer Dice make complications more likely as the clock advances.'
    ],
    quiz:{question:'On the fourth interval, a d10 Timer Die rolls a 3. Does it trigger?',options:['Yes','No','Only on a critical failure'],correct:0,explanation:'Three is at or below interval four (PDF p. 29).'}
  },
  {
    id:'favor', title:'Favor and Resolve', category:'Core resolution', page:30,
    summary:'Spend limited resources before a roll to improve its chance; Resolve also underwrites several survival choices.',
    details:[
      'Each Favor spent before a roll increases its modified target by 10, with at most three Favor on one roll from all sources.',
      'A character can use Resolve to supply Favor for their own rolls, or spend Resolve to improve Initiative one-for-one.',
      'Spending three Resolve can avert certain severe Shock, dying or instant-death consequences as specified by the wounds rules.',
      'Resolve is internal effort, not permission to change the GM’s narrative.'
    ],
    example:{situation:'Survival 50; spend 2 Resolve to gain +20 before rolling.',takeaway:'The modified target for this check is 70.'}
  },
  {
    id:'fatigue', title:'Resolve track and Fatigue', category:'Core resolution', page:31,
    summary:'Fatigue occupies capacity that would otherwise be available for Resolve.',
    details:[
      'Spend Resolve from one end of its track and mark Fatigue from the opposite end; the effects share finite capacity.',
      'When every Resolve box is already spent or blocked, further Fatigue can create special fatigue-related wounds.',
      'Rest recovers Resolve and Fatigue at rates shaped by the quality of the rest.',
      'For extended-roll intervals of at least one hour, Resolve normally cannot be spent to boost the check.'
    ]
  },
  {
    id:'skills', title:'Skill categories', category:'Skills & talents', page:33,
    summary:'Combat, Adventuring, Social, Lore and Magic skills organize what a character can attempt.',
    details:[
      'Combat skills include Dodge, melee weapon groups, missile attacks and unarmed Might.',
      'Adventuring covers survival, perception, tracking, stealth, travel, endurance, riding and tools.',
      'Social skills handle persuasion, deceit, influence and understanding people; Lore skills cover knowledge, crafts, languages and specialized “-wise” subjects.',
      'Magic is separate: Binds are rolled skills, Strands describe the aspect controlled, and Piety governs divine requests.'
    ]
  },
  {
    id:'competency', title:'Competency and automatic success', category:'Skills & talents', page:38,
    summary:'A high skill can justify an uncontested outcome without rolling, at the GM’s discretion.',
    details:[
      'A GM may recognize a sufficient skill rating for an uncomplicated yes/no task without requesting a die roll.',
      'If the GM bypasses the roll, treat the successful result as the minimum 1 SL unless Expertise raises that floor.',
      'This does not replace opposed rolls or combat and cannot guarantee higher-degree outcomes.'
    ]
  },
  {
    id:'support', title:'Supporting skills and group checks', category:'Skills & talents', page:41,
    summary:'A relevant secondary skill can aid the main skill; group checks combine the fate of a party.',
    details:[
      'Double the supporting skill’s unmodified Score and add that number to the main skill’s target.',
      'Only one supporting skill assists a given roll, including when help comes from another character.',
      'For a group check, the GM chooses the highest or lowest relevant character skill depending on what the situation demands.'
    ],
    example:{situation:'Persuade 56 aided by Divinity 43.',takeaway:'Divinity Score 4 becomes +8 support, making the Persuade target 64.'}
  },
  {
    id:'talents', title:'Talents', category:'Skills & talents', page:42,
    summary:'Talents provide focused situational benefits and are generally acquired through advancement.',
    details:[
      'Some Talents are available through race, aptitude or previous career during creation.',
      'Most additional Talents are acquired by spending XP after play begins.',
      'The default cost is 5 XP unless an individual Talent says otherwise. Check its prerequisites and specific description in the book.'
    ]
  },
  {
    id:'expertise', title:'Expertise minimum SL', category:'Skills & talents', page:58,
    summary:'Expertise sets a lower bound on SLs for successful rolls with a specific skill.',
    details:[
      'Ex2, Ex3 and Ex4 mean at least 2, 3 or 4 SLs respectively when that skill succeeds; failures gain nothing.',
      'It applies separately to each skill and does not prevent an opponent from reducing DoS.',
      'Expertise cannot exceed the appropriate cap tied to the skill’s Score, and cannot exceed Ex4.',
      'Strands and Piety never gain Expertise.'
    ],
    example:{situation:'Survival 65 Ex2; die shows 16.',takeaway:'The successful result becomes 2 SL rather than 1.'},
    quiz:{question:'Does Ex3 turn a failed skill test into a success?',options:['Yes','No','Only in combat'],correct:1,explanation:'Expertise only raises SLs for successful rolls (PDF p. 58).'}
  },
  {
    id:'origins', title:'Character creation: the full sequence', category:'Character creation', page:83,
    summary:'The book lays out 12 cumulative stages, beginning with base skills and ending with optional Status.',
    details:[
      'Concept and starting skills → race → two ability-score aptitudes → derived attributes.',
      'Next come cultural background, three life events, previous career and rounding out.',
      'Finish with equipment, personality traits, individual/shared goals and optional Status.',
      'Many choices modify values established earlier. The existing forge is a narrative editor, not yet an automated legality validator.'
    ]
  },
  {
    id:'base-skills', title:'Step 1: starting skills', category:'Character creation', page:84,
    summary:'Choose one skill in each non-magic category at 30, with most other listed mundane skills beginning at 20.',
    details:[
      'Select one each from Combat, Adventuring, Social and Lore to begin at 30.',
      'Other standard non-magic skills begin at 20. Custom “-wise” topics and languages are exceptions left at zero initially.',
      'Magic skills begin at zero and have their own later progression.',
      'During character creation, ordinary skills cannot be increased above 70; Strand levels cannot exceed 5.'
    ],
    quiz:{question:'How many non-magic skill categories receive one starting skill at 30?',options:['Two','Four','Five'],correct:1,explanation:'Combat, Adventuring, Social, and Lore each receive one 30 (PDF p. 84).'}
  },
  {
    id:'race', title:'Step 2: race and traits', category:'Character creation', page:85,
    summary:'Select a playable people, apply its listed trait adjustments, and record its language and talent options.',
    details:[
      'The available choices are Human, Half-Orc (Uthrak), Dwarf, Ogre, Bolg Fiir and Replaced.',
      'Racial adjustments can raise or lower skills; a negative outcome cannot reduce the final current skill below zero.',
      'Non-human characters may select a race-specific Talent when creation offers a Talent choice.',
      'Duplicate Talent grants offer an alternative compensation described in the book. Apply the specific race rules from pages 85–89.'
    ]
  },
  {
    id:'aptitudes', title:'Step 3: ability-score aptitudes', category:'Character creation', page:90,
    summary:'Choose two familiar aptitude themes; each improves associated skills and grants expertise and a talent.',
    details:[
      'These “ability scores” are not numerical attributes or independent roll targets; they are themed packages of bonuses.',
      'Choose two of the six aptitudes. Each grants +5 to its listed skills, one Expertise improvement, a listed Talent, and a descriptor.',
      'They represent predisposition before subsequent culture and career adjustments.'
    ]
  },
  {
    id:'attributes', title:'Step 4: derived attributes', category:'Character creation', page:91,
    summary:'Allocate five starting Attribute points across Resolve, Initiative, Toughness and Death Threshold.',
    details:[
      'Start with Max Resolve 10, Initiative +10, Toughness 0 and Death Threshold 20.',
      'Each point put into Max Resolve provides +2; each point in Initiative provides +1; Toughness costs two points per +1; each point in Death Threshold provides +2.',
      'Lethality Level derives from Death Threshold and does not directly receive a creation point.',
      'The book gives optional randomized versions of some starting numbers. Those alternatives should not be mixed into the standard calculation without consulting the page.'
    ],
    quiz:{question:'At creation, how many total Attribute points are allocated?',options:['3','5','10'],correct:1,explanation:'Five are distributed among the first four attributes (PDF p. 91).'}
  },
  {
    id:'culture', title:'Step 5: cultural background', category:'Character creation', page:93,
    summary:'Culture adds skill bonuses, selected Expertise and starting silver to the growing character.',
    details:[
      'The four broad backgrounds are civilized urban, civilized rural, barbarian and wanderer.',
      'Culture bonuses stack with earlier choices and are followed by life-event and career gains.',
      'When a grant says to increase Expertise, it can establish Ex2 or advance an existing Expertise level as described.'
    ]
  },
  {
    id:'life-events', title:'Step 6: life events and relationships', category:'Character creation', page:95,
    summary:'Roll once each for origin, youth and recent events, turning biography into skills and story connections.',
    details:[
      'Each of the three events can affect a skill or another aspect of the character depending on the result.',
      'Players may connect existing events into shared histories with other PCs, with narrowly specified skill benefits.',
      'Each event can also prompt a relationship NPC: Friend, Patron, Rival or Adversary.',
      'Detailed event table results are in the purchased PDF; they are not republished in this app.'
    ]
  },
  {
    id:'career', title:'Step 7: previous career', category:'Character creation', page:106,
    summary:'A previous career is a past occupation, not a permanent class.',
    details:[
      'Its allocation supplies skill points by category, starting resources, talents and possibly language or specialist knowledge.',
      'Career skill points are spent only in their assigned categories; do not transfer points between categories.',
      'No skill exceeds 70 in character creation.',
      'The ten career options span warrior, rogue, ranger, speaker, bard, civilian, loremaster, merchant, Godbound and Spellweaver.'
    ]
  },
  {
    id:'round-out', title:'Step 8: rounding out', category:'Character creation', page:112,
    summary:'Choose a final reward and apply age-sensitive character improvements.',
    details:[
      'Choose a Talent, one Status increase, or starting silver as the non-skill bonus.',
      'Age influences Endurance and the amount and kinds of final skill points available.',
      'Only appropriate magically trained characters may assign final points to Binds, Strands or Piety, within creation limits.',
      'Apply caps and requirements to each increment, not only at the end.'
    ]
  },
  {
    id:'start-gear', title:'Step 9: starting equipment', category:'Character creation', page:113,
    summary:'Begin with a dagger, some armor, starting silver and four basic supply dice.',
    details:[
      'The equipment procedure provides a dagger, 1d3+1 permitted armor pieces, and an additional 2d4 × 50 silver to spend.',
      'After choosing gear, record weapon/armor statistics, carrying burden and Initiative penalties.',
      'Gear, Ammo, Rations and Medical Supply Dice each begin at d12.',
      'A GM may modify starting equipment for a character with high Status.'
    ]
  },
  {
    id:'personality', title:'Step 10: personality traits', category:'Character creation', page:114,
    summary:'Traits make motivations mechanically relevant in rare, dramatically important scenes.',
    details:[
      'Choose two or three descriptive traits and change them as the character evolves.',
      'With GM approval, a relevant trait may justify a circumstantial bonus or a voluntary penalty of up to 20.',
      'Taking a meaningful voluntary penalty can earn an XP award at session end, with the limit described in advancement rules.'
    ]
  },
  {
    id:'goals', title:'Step 11: goals and shared ambitions', category:'Character creation', page:115,
    summary:'Use specific objectives to organize play and create reasons for characters to adventure together.',
    details:[
      'An individual objective and a shared party objective are useful starting points, though goals can emerge during play.',
      'A working campaign usually tracks about three to five current goals.',
      'Goals connect personal history, party ties and the session XP system.'
    ]
  },
  {
    id:'status', title:'Step 12: Status (optional)', category:'Character creation', page:118,
    summary:'Status models reputation, access, standing and resources in communities where the character is known.',
    details:[
      'Status is distinct from coins. Social legitimacy and established connections can provide practical benefits.',
      'Its effects rely on recognized standing in a community; in an unfamiliar place, effective Status can be zero.',
      'The Status subsystem is optional and must be applied with its dedicated chapter guidance.'
    ]
  },
  {
    id:'xp', title:'Earning XP for goals', category:'Advancement', page:126,
    summary:'Pursuing objectives, completing goals, meaningful failure and revelations can award experience.',
    details:[
      'Overcoming meaningful obstacles while pursuing one or more goals yields 3 XP under the session procedure.',
      'Completing an individual goal grants 1 XP; completing a shared goal awards 2 XP to each participating party member.',
      'A meaningful failed/abandoned goal, a revelation, or a relevant personality-trait penalty can yield an additional XP award under stated limits.'
    ],
    quiz:{question:'A party member completes a shared goal. What XP is awarded for that completion?',options:['1 XP to the group total','2 XP to each party member who shared it','5 XP to only the leader'],correct:1,explanation:'The shared-goal reward is individual to each participating party member (PDF p. 126).'}
  },
  {
    id:'spend-xp', title:'Spending XP', category:'Advancement', page:128,
    summary:'Spend earned experience between sessions to develop individual skills and Talents.',
    details:[
      'Improvement is incremental, not a sudden level jump. More developed skills become harder to raise.',
      'Talents and Expertise have their own restrictions and costs.',
      'XP spending happens between sessions rather than during active scenes. Refer to the detailed cost rules on PDF pages 128–129.'
    ]
  },
  {
    id:'supply', title:'Supply Dice', category:'Equipment & combat', page:132,
    summary:'Abstract quantities of consumables with dice that step down when their reserve runs low.',
    details:[
      'Gear, Ammo, Medical and Rations use the d12 → d10 → d8 → d6 progression.',
      'Roll the relevant Supply Die after use. On a result of 1–2, reduce the die one step.',
      'If a d6 is depleted, that supply category is empty until replenished.'
    ],
    example:{situation:'Ammo d10; the die shows 2 after firing.',takeaway:'The next Ammo die is d8.'},
    quiz:{question:'An Ammo d8 rolls a 2 after use. What does it become?',options:['d6','d10','Still d8'],correct:0,explanation:'On 1 or 2, step down one die size (PDF p. 132).'}
  },
  {
    id:'encumbrance', title:'Carrying gear and encumbrance', category:'Equipment & combat', page:134,
    summary:'Encumbrance measures practical burden and access, not literal weight.',
    details:[
      'Different pools cover weapons at hand, worn armor, supplies and general inventory.',
      'Weapon and shield access, worn armor Bulk and extra Supply Dice each have distinct carrying constraints.',
      'Armor Bulk may penalize Initiative even when inventory capacity is available.'
    ]
  },
  {
    id:'combat', title:'Combat procedure', category:'Equipment & combat', page:151,
    summary:'An attack is an opposed roll; damage follows DoS, hit location, protection and Wound Die.',
    details:[
      'Roll Initiative, take a turn with action and movement, then compare the attack roll against defense.',
      'An attacker who wins may apply an eligible maneuver, then adds their DoS to weapon damage.',
      'The dice determine general and detailed hit location; covering armor or shield protection reduces the wound.',
      'After damage becomes Wound Points, the target resolves the Wound Die and its consequences.'
    ]
  },
  {
    id:'initiative', title:'Initiative and battlefield zones', category:'Equipment & combat', page:152,
    summary:'A round is roughly six seconds; characters act by Initiative and usually have one action and one zone of movement.',
    details:[
      'PCs normally roll d10 plus their current Initiative, while most enemies act at a fixed Initiative.',
      'Armor changes Initiative; Resolve can be spent one-for-one to boost the round’s total.',
      'Battlefields use abstract zones, with Close, Engaged and longer ranges serving the action rather than exact grid squares.',
      'Defending an incoming attack is a reaction, not the defender’s action for the turn.'
    ]
  },
  {
    id:'maneuvers', title:'Combat maneuvers', category:'Equipment & combat', page:166,
    summary:'After winning an attack, the attacker may turn rolled SLs into a tactical maneuver.',
    details:[
      'Maneuver eligibility is based on the attacker’s successful rolled SLs, not only the net DoS.',
      'These choices can change a foe’s position or condition instead of simply increasing damage.',
      'A critical successful attack may qualify for two maneuvers, subject to the requirements of each.'
    ]
  },
  {
    id:'wounds', title:'Localized wounds and armor', category:'Wounds & recovery', page:175,
    summary:'Damage creates individual location-based wounds; armor protects against external injury.',
    details:[
      'Keep wounds separate by hit location, because recovery and infection apply to each wound.',
      'Subtract applicable location armor/shield AP from external damage before recording Wound Points.',
      'Internal damage often bypasses armor, and some hazards inflict wounds directly.',
      'Total lethal Wound Points interact with Death Threshold and the dying rules.'
    ]
  },
  {
    id:'wound-die', title:'Wound Die, impairment and shock', category:'Wounds & recovery', page:177,
    summary:'Each new wound demands a Wound Die check that may impair a location.',
    details:[
      'Roll d10 plus Toughness against the total Wound Points in the affected location.',
      'A result at or below that location’s Wound Points causes impairment; natural ten avoids impairment.',
      'An impaired location causes effects based on the body part; being impaired again can throw a character into Shock.'
    ],
    quiz:{question:'A wound is taken and the Wound Die shows natural 10. What about impairment?',options:['It is automatically avoided','It automatically occurs','A second Wound Die is rolled'],correct:0,explanation:'The natural ten exception avoids impairment (PDF p. 177).'}
  },
  {
    id:'dying', title:'Dying and Death Threshold', category:'Wounds & recovery', page:178,
    summary:'A character in Shock can begin dying if total lethal wounds exceed Lethality Level.',
    details:[
      'Dying checks escalate as rounds pass after Shock begins. Wound Die plus Toughness may stabilize or end the character.',
      'A natural ten on the dying Wound Die stabilizes the character.',
      'Crossing the Death Threshold has its own fatal consequences, with narrowly defined Resolve interventions.'
    ]
  },
  {
    id:'travel', title:'The eight-step Journey', category:'Travel', page:203,
    summary:'A Journey is divided into legs; each leg follows a repeatable procedure balancing route, fatigue and events.',
    details:[
      'Plan a route; gather Travel Lore; resolve the Guide’s movement and the Quartermaster’s resources/fatigue.',
      'Check infection and describe travel conditions, then the Scout assesses the next Event.',
      'Finally, continue to another leg or switch to detailed Daily Time. The actual steps are indexed on PDF pages 203–216.'
    ]
  },
  {
    id:'travel-roles', title:'Guide, Quartermaster and Scout', category:'Travel', page:206,
    summary:'Journey roles split responsibility between route-finding, fatigue mitigation and spotting trouble.',
    details:[
      'The Guide uses Track to navigate and determine how far the group gets between major events.',
      'The Quartermaster uses Survival to improve the fatigue outcome.',
      'The Scout uses Perception before a travel Event to prevent surprise or enable a first-action benefit.',
      'Relevant Travel Lore is a short-lived shared pool of Favor for upcoming leg duties.'
    ]
  },
  {
    id:'travel-time', title:'Journey versus HexMarch', category:'Travel', page:222,
    summary:'Use the Journey abstraction for planned routes; switch to HexMarch for deliberate hex-by-hex exploration.',
    details:[
      'A Journey compresses travel into repeatable legs. Daily Time tracks personal recovery, supplies, infection and encounters more closely.',
      'HexMarch handles slow exploration and discovery in Daily Time, including daily weather and travel consequences.',
      'The right procedure depends on whether the table wants to reach a destination or explore the intervening terrain.'
    ]
  },
  {
    id:'intrigue', title:'When to use a social encounter', category:'Intrigue', page:253,
    summary:'Reserve structured social conflict for consequential objectives, rather than making every conversation a contest.',
    details:[
      'Routine requests can remain in free roleplay or a single relevant roll.',
      'A significant request from an important NPC, with a real cost of failure, may call for a formal social encounter.',
      'Players choose the social approach; the GM chooses fitting skills and interprets the result.'
    ]
  },
  {
    id:'social-contests', title:'Static and competitive social contests', category:'Intrigue', page:256,
    summary:'Static contests build influence within an NPC’s Tolerance; competitive contests race another side to a goal.',
    details:[
      'Both styles build on repeated social skill rolls and accumulated SLs, with critical failures reducing progress.',
      'The default Tolerance for a static encounter is 5; an NPC’s disposition can change this before the first roll.',
      'Competitive contests use an SL Victory Condition, normally 15, with room for an initial advantage.',
      'Results can create compromises, ordinary concessions or extra benefits depending on success margins.'
    ]
  },
  {
    id:'leverage', title:'Social Leverage', category:'Intrigue', page:261,
    summary:'Useful information or a relationship with an NPC can provide a temporary Favor pool.',
    details:[
      'Leverage can be friendly, political or coercive; it should genuinely relate to the specific social approach.',
      'A group can spend the resulting Favor on fitting social rolls, with the normal limit of three Favor on one roll.',
      'Investigating an NPC beforehand can generate Leverage rather than relying on blind persuasion.'
    ]
  },
  {
    id:'magic', title:'Binds and Strands', category:'Weave magic', page:278,
    summary:'A Bind is the action the caster takes; a Strand is the aspect of reality being affected.',
    details:[
      'The five Binds are Change, Conjure, Control, Destroy and Witness.',
      'Strands describe the relevant substance or domain of reality. Casting uses the Bind skill, while Strand rating contributes to Mastery.',
      'Effects are improvised under bounded limitations, not drawn exclusively from a fixed spell list.'
    ],
    quiz:{question:'Which component is rolled to cast a Weave spell?',options:['The Strand','The Bind skill','The character’s Status'],correct:1,explanation:'The Bind is rolled; the Strand contributes to Mastery (PDF pp. 278, 285).'}
  },
  {
    id:'spell-cost', title:'Weave cost and Mastery', category:'Weave magic', page:285,
    summary:'Build a spell’s Total Cost from its desired effect, then compare that against Mastery after a successful Bind roll.',
    details:[
      'A caster requires at least one available Resolve and nonzero relevant Bind and Strand values.',
      'Magnitude, Target, Range, Duration, Effect and armor-related penalties combine into Total Cost (TC).',
      'The Bind roll sets resistance. Mastery draws on the ones die, Strand value, Threads and applicable mitigation.',
      'When Mastery is below TC, the spell succeeds but risks a Weave Reaction unless the deficit is mitigated.'
    ]
  },
  {
    id:'spell-casting', title:'Casting and backlash', category:'Weave magic', page:287,
    summary:'Shape the effect, roll the Bind, mitigate any uncontrolled result, then resolve resistance and consequences.',
    details:[
      'The caster specifies intent, chooses Magnitude and Bind/Strand, and pays attention to the shaped spell’s Total Cost.',
      'A failed casting generally consumes one Resolve; a critical failure adds immediate backlash consequences.',
      'Resolve spent after a successful uncontrolled casting can reduce the Weave Reaction modifier; this mitigation is an exception to the usual three-point limit.',
      'When needed, targets resist with opposed rolls. Uncontrolled spells use the Weave Reaction Table.'
    ]
  },
  {
    id:'spell-resistance', title:'Resisting Weave magic', category:'Weave magic', page:282,
    summary:'An unwilling direct target gets a relevant opposed defense against the casting result.',
    details:[
      'Dodge, Endurance and Willpower are frequent default defenses, but the best choice depends on the effect and GM ruling.',
      'Successfully resisting negates the intended spell effect for that target; DoS does not modify this decision.',
      'Resistance itself consumes no normal action. Longer magical effects may allow new attempts when circumstances materially change.'
    ]
  },
  {
    id:'fraying', title:'Fraying and magical consequences', category:'Weave magic', page:312,
    summary:'Long-term magical stress accumulates, eventually risking the caster’s removal from reality.',
    details:[
      'Fraying can arise from rituals, magical backlash and certain special circumstances.',
      'Once accumulated Fraying passes Max Resolve, new increases can require a percentile survival check.',
      'The risk increases with the gap between Fraying and Max Resolve. Consult the book’s full procedure before adjudicating this irreversible result.'
    ]
  },
  {
    id:'divine', title:'Godbound, Piety and Domains', category:'Divine magic', page:349,
    summary:'Godbound characters petition a patron deity; Piety is a changing measure of divine favor.',
    details:[
      'The Godbound Talent grants starting Piety 30. Piety rises through devotion and service rather than ordinary XP spending.',
      'Base Piety cannot exceed 90, though temporary modifiers may lift the roll target higher.',
      'Piety never takes Expertise, and the gods’ Domains determine the kinds of miracles available.'
    ]
  },
  {
    id:'miracles', title:'Requesting a miracle', category:'Divine magic', page:351,
    summary:'A successful Piety request may yield a Lesser, Middle or Greater miracle within the deity’s Domains.',
    details:[
      'The Godbound asks rather than commands; the deity’s concerns and current context determine how help manifests.',
      'Piety SLs influence the scale of the granted effect; the god cannot grant a miracle outside its Domains.',
      'Adverse miracles offer targets a resistance check governed by the context of their relationship to the deity.'
    ]
  },
  {
    id:'enemy-difficulty', title:'Assigning enemy skill difficulty', category:'Gamemaster & foes', page:441,
    summary:'Enemy ratings describe the opposition’s most relevant skills, with a lighter set of supporting capabilities.',
    details:[
      'Begin with the foe’s intended challenge and the Average Skill appropriate to that threat rather than calculating a rigid difficulty score.',
      'Give the enemy a few defining skills at its typical rating, other useful skills slightly below that, and ordinary skills lower still.',
      'Leaders can receive stronger specialty skills. These values are starting points for GM judgment, not a promise of a balanced encounter.'
    ]
  },
  {
    id:'size', title:'Creature size in combat', category:'Gamemaster & foes', page:443,
    summary:'Size differences affect initiative, reach, grappling, target difficulty and permissible maneuvers.',
    details:[
      'Creature sizes range from minute to colossal, with human-sized combatants classed as Medium.',
      'A creature three or more size categories larger can become impossible to parry, restrict certain maneuvers, and make itself easier to hit.',
      'In a grapple, the larger participant benefits from a Might advantage. Most listed bestiary profiles already incorporate size effects.'
    ]
  },
  {
    id:'ferocity', title:'Ferocity and enemy morale', category:'Gamemaster & foes', page:444,
    summary:'Ferocity estimates when a creature will retreat, surrender or otherwise stop fighting.',
    details:[
      'The 1–6 Ferocity scale covers fearful creatures through foes that will not break.',
      'Morale checks are appropriate after major injuries, heavy losses, losing a leader, or when the tactical situation looks hopeless.',
      'The GM can adjust Ferocity to reflect circumstances. A creature defending its young may be far more committed than one merely hunting.'
    ]
  },
  {
    id:'creature-abilities', title:'Special creature abilities', category:'Gamemaster & foes', page:445,
    summary:'Bestiary abilities change specific combat assumptions; read each trait before applying the ordinary procedure.',
    details:[
      'Examples include natural weapons, magical defenses, different movement rates, multiple turns and special forms of resilience.',
      'A trait may change what types of attacks can be parried or which maneuvers and conditions affect the creature.',
      'Do not assume a trait from an ordinary species description. Apply the exact ability listed in the creature profile.'
    ]
  },
  {
    id:'npc-magic', title:'Simplified NPC spellcasting', category:'Gamemaster & foes', page:447,
    summary:'GMs can resolve enemy Spellweavers with a streamlined casting method rather than fully preparing every spell.',
    details:[
      'Choose an appropriate Bind and Strand and determine the intended effect within the normal laws of magic.',
      'The NPC rolls its Bind. The result sets resistance; control and possible reaction are evaluated using the streamlined NPC procedure.',
      'The GM may instead use the normal Spellweaver casting model for important NPCs, but should not mix both systems in one casting.'
    ]
  },
  {
    id:'solo-principles', title:'Solo play principles', category:'Solo roleplaying', page:486,
    summary:'In solo play, create meaningful complications and let the character’s choices drive a focused sequence of scenes.',
    details:[
      'Ask questions that introduce a chance of conflict rather than confirming an uneventful world.',
      'Interpret prompts using the existing situation; trust initial plausible interpretations instead of perpetually rerolling.',
      'Advance character goals actively and move between scenes when the interesting decision has been resolved.'
    ]
  },
  {
    id:'solo-oracle', title:'Ask the Weave: yes/no oracle', category:'Solo roleplaying', page:490,
    summary:'Assign odds, roll percentile dice, and interpret ordinary or extreme yes/no answers.',
    details:[
      'Form a question with a meaningful consequence and choose how likely a positive result is.',
      'Neutral odds use the middle probability, while likely and unlikely odds reflect prior context.',
      'Use the oracle when uncertainty changes what happens; skip it when the answer can be sensibly decided without a roll.',
      'The precise percentile bands for each odds category are in the purchased book.'
    ],
    quiz:{question:'What should you decide before asking the solo oracle?',options:['Which answer you want','The yes/no question and its odds','A new character class'],correct:1,explanation:'Set the question and probability first (PDF p. 490).'}
  },
  {
    id:'solo-events', title:'Critical oracle rolls and random events', category:'Solo roleplaying', page:491,
    summary:'Critical percentile results on oracle questions can introduce an extra complication or discovery.',
    details:[
      'Matching percentile dice trigger a Random Event in addition to the oracle answer.',
      'Determine the event’s kind, then interpret prompts in the context of current goals, people and circumstances.',
      'Random events are provocations for imagination, not prewritten scenes requiring a fixed interpretation.'
    ]
  },
  {
    id:'solo-scenes', title:'Starting a new solo scene', category:'Solo roleplaying', page:493,
    summary:'Decide what the next scene should look like and optionally test whether reality changes those expectations.',
    details:[
      'A scene is a focused activity; end it when its central concern resolves or attention moves elsewhere.',
      'A subversion check can leave expectations intact, remove something expected, add something new, or replace the opening with an unexpected event.',
      'When the scene’s arrival is already clear, skip the table and begin the scene directly.'
    ]
  },
  {
    id:'solo-npcs', title:'Fast solo NPC creation', category:'Solo roleplaying', page:495,
    summary:'A few descriptive prompts give an NPC consistent identity without demanding a full stat block.',
    details:[
      'Interpret a small set of random tags for personality, appearance, role and motives.',
      'Assign specific skills and attributes only when the scene needs them. Ask the oracle if an uncertain ability exists or a guess is too high.',
      'Revise numbers that contradict established fiction; coherence matters more than a perfect initial random value.'
    ]
  },
  {
    id:'mass-units', title:'Mass combat: units and facing', category:'Mass combat', page:592,
    summary:'Units represent bodies of soldiers with attack, defense, morale, movement and facing characteristics.',
    details:[
      'A unit card tracks the number of soldiers and individual injuries alongside its fighting dice and initiative.',
      'Place units within abstract battlefield zones; facing determines which enemies can be attacked and where flank or rear pressure matters.',
      'A Commander makes strategic decisions while Leaders are attached to particular formations.'
    ]
  },
  {
    id:'mass-actions', title:'Mass combat: movement and actions', category:'Mass combat', page:593,
    summary:'Unit turns emphasize moving through terrain, changing facing, making attacks, charging and withdrawing.',
    details:[
      'Terrain reduces a formation’s available zone movement and can prevent an effective charge.',
      'Units cannot freely walk backward or sideways while keeping formation; turning may require a separate action.',
      'An engaged unit generally stays in place until it deliberately withdraws or breaks.'
    ]
  },
  {
    id:'mass-rolls', title:'Mass combat: opposed fighting dice', category:'Mass combat', page:594,
    summary:'Formations oppose fighting dice rather than rolling normal personal-percentile attack skills.',
    details:[
      'Compare the attackers’ adjusted melee or missile die totals against the appropriate opposing value.',
      'A higher result normally inflicts the difference as unit injuries, while a tied melee clash can wound both sides.',
      'Modifiers represent flanking, cover, charges and other conditions; apply only effects that fit the current attack.'
    ],
    quiz:{question:'In a mass-combat melee, two units roll exactly the same final total. What happens?',options:['No unit suffers harm','Each side receives one wound mark','Both units immediately break'],correct:1,explanation:'Tied melee totals inflict a wound mark on both units (PDF p. 594).'}
  },
  {
    id:'mass-casualties', title:'Mass combat: the casualty bar', category:'Mass combat', page:595,
    summary:'Injuries accumulate in a unit’s casualty boxes and may become losses of individual soldiers.',
    details:[
      'A first slash represents injury and a second mark in the same box represents a casualty.',
      'Injuries fill boxes consecutively; players decide whether to spread the damage or finish wounded soldiers within the allowed sequence.',
      'As casualties mount, morale and attack effectiveness degrade. A unit without remaining soldiers is removed.'
    ]
  },
  {
    id:'mass-morale', title:'Mass combat: morale, breaks and rallying', category:'Mass combat', page:596,
    summary:'Reaching casualty thresholds forces morale checks, and a broken formation risks disrupting nearby allies.',
    details:[
      'Morale checks occur as injury reaches key fractions of the unit’s original strength; worsening losses can penalize its fighting.',
      'A failed morale roll causes the unit to break, flee and become vulnerable to attacks.',
      'An attached leader can try to rally the unit; a PC Commander can use Battle-wise to help a formation.'
    ]
  },
  {
    id:'mass-magic', title:'Spellcasters in mass combat', category:'Mass combat', page:597,
    summary:'Mass combat abstracts Spellweaver effects into battlefield assault, protection or manipulation.',
    details:[
      'Choose the effect class and its scale using the simplified mass-battle procedure.',
      'A Bind roll determines whether the action succeeds; the desired strength determines the resources needed to suppress backlash.',
      'Unlike personal combat spellcasting, these procedures influence whole formations or zones.'
    ]
  },
  {
    id:'naval-setup', title:'Naval combat: ships and opening range', category:'Naval combat', page:600,
    summary:'A ship-to-ship engagement tracks relative cable lengths and uses ship-level skills.',
    details:[
      'Each ship has Maneuvering, Crew, Weapon and Hull values. Damage can reduce the ship’s future fighting capability.',
      'A naval round represents several minutes and begins with ships choosing a maneuvering objective.',
      'Initial separation is determined from the scenario or a starting-range roll; Hull falling to zero destroys the vessel.'
    ]
  },
  {
    id:'naval-position', title:'Naval combat: winning position', category:'Naval combat', page:601,
    summary:'Opposed Maneuvering rolls decide which vessel can change range or line up a shot.',
    details:[
      'Each ship chooses whether it will change distance or compete for firing position before making the roll.',
      'Only the successful winner gains the declared advantage; a strong margin while seeking firing position grants a firing bonus.',
      'A captain can risk harm to the ship or crew to gain a temporary maneuvering edge.'
    ],
    quiz:{question:'Which ship action creates the opportunity to fire?',options:['Change Distance','Vie for Firing Position','Emergency Repair'],correct:1,explanation:'Winning the positioning contest enables a Weapon roll (PDF pp. 600–601).'}
  },
  {
    id:'naval-fire', title:'Naval combat: firing and damage', category:'Naval combat', page:602,
    summary:'A winning firing position permits a Weapon check that reduces a selected ship capability.',
    details:[
      'A successful Weapon roll uses generated SLs and the chosen armament’s multiplier to determine damage.',
      'The firing die result determines which enemy ship value takes damage, with an exceptional choice result.',
      'When Maneuvering, Crew or Weapon fall to zero, the vessel loses that capability. Unlike ordinary character checks, ship ratings at zero have no minimum automatic success chance.'
    ]
  },
  {
    id:'naval-boarding', title:'Naval combat: boarding actions', category:'Naval combat', page:603,
    summary:'At very close range, crews can grapple ships and resolve boarding with opposed Crew rolls.',
    details:[
      'Within one cable length, ships can begin boarding; the opposed Crew result causes losses to the weaker crew.',
      'Personal combat can occur inside the larger boarding action and can influence crew-level checks.',
      'The rules allow risky withdrawal, surrender, and emergency repair procedures.'
    ]
  },
  {
    id:'naval-repairs', title:'Naval combat: repairs', category:'Naval combat', page:603,
    summary:'Friendly ports and improvised field repairs recover different kinds of ship capability.',
    details:[
      'Port repairs cost money and can restore relevant ship values within the daily limits.',
      'Emergency repairs need suitable materials and a safe place, and only restore certain damaged ship systems.',
      'A suitable leadership or crafting skill may increase daily recovery during improvised repairs.'
    ]
  },
  {
    id:'personality-pairs', title:'Optional opposing personality traits', category:'Optional rules & rewards', page:606,
    summary:'The appendix offers an alternate scored-pair model that replaces the basic personality trait approach.',
    details:[
      'Choose opposing trait pairs with scores representing which impulse is more likely in a difficult moment.',
      'A percentile roll can resolve a genuine personality dilemma; the selected approach can affect skill checks and reward character growth.',
      'This is an optional replacement for the chapter-seven personality rules, not a bonus layered on top of them.'
    ]
  },
  {
    id:'treasure-type', title:'Treasure categories and discoveries', category:'Optional rules & rewards', page:646,
    summary:'The treasure appendix uses tiered types to generate appropriate loot and story hooks.',
    details:[
      'A treasure type reflects the danger and significance of the source, not a universal entitlement to valuable goods.',
      'The same generation process can suggest coins, specialized supplies, curiosities, magical objects or clues.',
      'Treasure prompts can be adapted to the fiction rather than followed as a restrictive inventory table.'
    ]
  },
  {
    id:'masterwork-items', title:'Masterwork equipment effects', category:'Optional rules & rewards', page:650,
    summary:'Certain especially well-made items improve specific skills, weapon damage or protection.',
    details:[
      'A quality tool can offer a small bonus to the particular activity it facilitates, rather than to every possible roll.',
      'Weapons and armor may have different masterwork benefits, determined by their generated form.',
      'The purchase and treasure tables contain detailed examples and exceptions.'
    ]
  }
];

export const ARTICLES: RuleArticle[] = seeds.map(a => ({
  ...a, source: CORE_BOOK, sourceTitle: 'Core Rulebook · PDF page ' + a.page, status: 'core-rulebook'
}));
export const CATEGORIES = ['All', ...Array.from(new Set(ARTICLES.map(a => a.category)))];
