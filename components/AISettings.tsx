import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseService';

const endpoint='https://csypcxkpipafxrjaborn.supabase.co/functions/v1/adt-ai';
export async function aiRequest(action:string,payload:Record<string,unknown>={}) {
  const {data:{session}}=await supabase.auth.getSession();
  if(!session) throw new Error('Reconnectez-vous pour modifier les paramètres.');
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',apikey:'sb_publishable_C5bc98EYLigfq9_UsXWzBw_qk5QNyfi'},body:JSON.stringify({...payload,action})});
  const body=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(body.error || 'Service de configuration indisponible.');
  return body;
}
const defaults={TCT:'Extraire toutes les tournées visibles, y compris sans employé ou véhicule affecté. Conserver les zéros initiaux des identifiants. Distinguer les deux colonnes Employé. Respecter la date du document, les horaires, le statut FDR et les cases à cocher. Ne jamais compléter une adresse tronquée ni inventer une valeur illisible.',OLYMEL:'Extraire chaque assignation visible. Conserver la semaine, le jour, la date et les horaires tels que lus. Ne pas inventer le chauffeur, le véhicule ou les notes. Une cellule vide reste vide. Ignorer les totaux et les séparateurs.'};
type Config={configured:boolean;model:string;skill_tct:string;skill_olymel:string;revision:number;updated_at:string};
type Model={id:string;name:string;prompt_price?:string;completion_price?:string};
export default function AISettings({isAdmin}:{isAdmin:boolean}) {
  const [refresh,setRefresh]=useState(0);
  const [config,setConfig]=useState<Config|null>(null);
  const [model,setModel]=useState('');
  const [key,setKey]=useState('');
  const [skills,setSkills]=useState({TCT:'',OLYMEL:''});
  const [doc,setDoc]=useState<'TCT'|'OLYMEL'>('TCT');
  const [catalog,setCatalog]=useState<Model[]>([]);
  const [search,setSearch]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{
    if(!isAdmin) return;
    let alive=true;
    setBusy(true);
    Promise.all([aiRequest('status'),aiRequest('models')]).then(([c,m])=>{
      if(!alive)return;
      setConfig(c);setModel(c.model);setSkills({TCT:c.skill_tct||defaults.TCT,OLYMEL:c.skill_olymel||defaults.OLYMEL});setCatalog(m.models||[]);
    }).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setBusy(false);});
    return()=>{alive=false;};
  },[isAdmin,refresh]);
  async function save(e:React.FormEvent) {
    e.preventDefault(); if(!config)return;
    setBusy(true);setError('');setMessage('');
    try {
      await aiRequest('save',{model,skill_tct:skills.TCT,skill_olymel:skills.OLYMEL,revision:config.revision,...(key.trim()?{api_key:key.trim()}: {})});
      setKey('');const c=await aiRequest('status');setConfig(c);
      setMessage('Clé, modèle et instructions enregistrés. Les prochaines extractions utiliseront ces réglages.');
    }catch(e:any){setError(e.message);}finally{setBusy(false);}
  }
  async function test() {
    setBusy(true);setError('');setMessage('');
    try {setMessage((await aiRequest('test')).message);}catch(e:any){setError(e.message);}finally{setBusy(false);}
  }
  async function importSkill(e:React.ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    if(file.size>80000||! /\.(md|txt)$/i.test(file.name)){setError('Choisissez un fichier .md ou .txt de moins de 80 Ko.');return;}
    const text=await file.text();
    if(text.length>20000){setError('Le skill doit contenir au maximum 20 000 caractères.');return;}
    setSkills(s=>({...s,[doc]:text}));setMessage(`Instructions ${doc} importées. Enregistrez pour les appliquer.`);setError('');
  }
  if(!isAdmin) return <><header className="page-header"><h1>Paramètres</h1></header><section className="panel settings-panel"><h2>Extraction IA</h2><p>Le modèle et les instructions sont configurés par votre administrateur.</p></section></>;
  const available=catalog.filter(m=>`${m.id} ${m.name}`.toLowerCase().includes(search.toLowerCase()));
  return <><header className="page-header"><div><p className="eyebrow">ADMINISTRATION</p><h1>Paramètres IA</h1><p className="muted">Configurez OpenRouter et les instructions utilisées pour vos documents.</p></div></header>
    <section className="panel ai-settings"><h2>OpenRouter</h2><button type="button" className="text-button" disabled={busy} onClick={()=>{setError('');setRefresh(v=>v+1);}}>Recharger les paramètres</button>
      <p className="muted">La clé est conservée chiffrée côté serveur. Elle ne sera plus affichée après l’enregistrement.</p>
      {error&&<p role="alert" className="notice error">{error}</p>}{message&&<p role="status" className="notice success">{message}</p>}
      {!config&&busy&&<p role="status">Chargement de la configuration…</p>}
      <form onSubmit={save} className="ai-form" aria-busy={busy}>
        <div><label htmlFor="openrouter-key">{config?.configured?'Remplacer la clé API OpenRouter':'Clé API OpenRouter'}</label>
          <input id="openrouter-key" type="password" autoComplete="off" spellCheck={false} maxLength={512} value={key} onChange={e=>setKey(e.target.value)} required={!config?.configured} disabled={!config||busy} placeholder={config?.configured?'Clé enregistrée — laisser vide pour la conserver':'sk-or-…'}/>
          <small>{config?.configured?'Une clé est enregistrée dans le coffre.':'Aucune clé enregistrée : les extractions sont indisponibles.'}</small>
        </div>
        <div><label htmlFor="model-search">Rechercher un modèle</label><input id="model-search" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nom ou fournisseur" disabled={!config||busy}/></div>
        <div><label htmlFor="openrouter-model">Modèle d’extraction</label><select id="openrouter-model" value={model} onChange={e=>setModel(e.target.value)} disabled={!config||busy} required><option value="">Choisir un modèle…</option>{model&&!available.some(m=>m.id===model)&&<option value={model}>{model}</option>}{available.map(m=><option key={m.id} value={m.id}>{m.name} — {m.id}</option>)}</select><small>{catalog.length} modèles compatibles images et JSON. Les tarifs et limites dépendent d’OpenRouter.</small></div>
        <fieldset disabled={!config||busy}><legend>Skill / instructions d’extraction</legend><div className="admin-actions"><button type="button" className="button button-secondary" aria-pressed={doc==='TCT'} onClick={()=>setDoc('TCT')}>TCT</button><button type="button" className="button button-secondary" aria-pressed={doc==='OLYMEL'} onClick={()=>setDoc('OLYMEL')}>Olymel</button></div>
          <label htmlFor="ai-skill">Instructions métier — {doc}</label><textarea id="ai-skill" rows={9} maxLength={20000} value={skills[doc]} onChange={e=>setSkills(s=>({...s,[doc]:e.target.value}))}/><small>{skills[doc].length}/20 000 caractères. Ces instructions complètent les règles de fidélité et de structure du tableau.</small>
          <label htmlFor="skill-file">Importer un skill (.md ou .txt)</label><input id="skill-file" type="file" accept=".md,.txt,text/plain,text/markdown" onChange={importSkill}/>
          <button type="button" className="text-button" onClick={()=>setSkills(s=>({...s,[doc]:defaults[doc]}))}>Restaurer les instructions {doc}</button>
        </fieldset>
        <div className="admin-actions"><button className="button button-primary" disabled={!config||busy}>{busy?'Traitement…':'Enregistrer la configuration'}</button><button type="button" className="button button-secondary" disabled={!config?.configured||busy} onClick={test}>Vérifier la clé enregistrée</button></div>
      </form>
      <p className="muted">La vérification contrôle la clé et la disponibilité du modèle ; elle ne valide pas encore la qualité d’une extraction. Limites : 5 extractions par minute et 100 par jour par utilisateur.</p>
    </section></>;
}
