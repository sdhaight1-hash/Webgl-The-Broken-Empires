import type {SoloCampaign,SoloNPC,SoloScene,SoloThread} from './soloEngine.ts';

export function editSceneWorksheet(c:SoloCampaign,id:string,changes:Partial<Pick<SoloScene,'title'|'location'|'expected'|'outcome'>>):SoloCampaign {
  if(!c.scenes.some(s=>s.id===id))throw new RangeError('Unknown scene');
  const limits={title:120,location:180,expected:1200,outcome:3000};
  for(const [key,value] of Object.entries(changes)){
    if(!(key in limits)||typeof value!=='string'||value.length>limits[key as keyof typeof limits])
      throw new RangeError('Invalid scene worksheet entry');
  }
  return {...c,scenes:c.scenes.map(s=>s.id===id?{...s,...changes}:s),updatedAt:new Date().toISOString()};
}
export function editNPCWorksheet(c:SoloCampaign,id:string,changes:Partial<Pick<SoloNPC,'name'|'role'|'disposition'|'details'|'tags'>>):SoloCampaign {
  if(!c.npcs.some(n=>n.id===id))throw new RangeError('Unknown NPC');
  const limits={name:150,role:200,disposition:200,details:4000,tags:1000};
  for(const [key,value] of Object.entries(changes)){
    if(!(key in limits)||typeof value!=='string'||value.length>limits[key as keyof typeof limits])
      throw new RangeError('Invalid NPC dossier entry');
  }
  return {...c,npcs:c.npcs.map(n=>n.id===id?{...n,...changes}:n),updatedAt:new Date().toISOString()};
}
export function editThreadWorksheet(c:SoloCampaign,id:string,changes:Partial<Pick<SoloThread,'title'|'done'>>):SoloCampaign {
  if(!c.threads.some(t=>t.id===id))throw new RangeError('Unknown story thread');
  if(changes.title!==undefined&&(typeof changes.title!=='string'||changes.title.length>400))
    throw new RangeError('Story thread title too long');
  if(changes.done!==undefined&&typeof changes.done!=='boolean')throw new RangeError('Invalid thread completion');
  return {...c,threads:c.threads.map(t=>t.id===id?{...t,...changes}:t),updatedAt:new Date().toISOString()};
}
