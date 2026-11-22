// Le navigateur ne reçoit jamais la clé OpenRouter : le traitement réside dans l’Edge Function ADT.
export const config = { maxDuration: 60 };
export default async function handler(req:any,res:any) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'Méthode non autorisée.'});
  const authorization=req.headers.authorization||'';
  if(!authorization.startsWith('Bearer ')) return res.status(401).json({error:'Connexion requise.'});
  try {
    const response=await fetch('https://csypcxkpipafxrjaborn.supabase.co/functions/v1/adt-ai',{method:'POST',headers:{Authorization:authorization,apikey:'sb_publishable_C5bc98EYLigfq9_UsXWzBw_qk5QNyfi','Content-Type':'application/json'},body:JSON.stringify({...req.body,action:'extract'}),signal:AbortSignal.timeout(55000)});
    const body=await response.json().catch(()=>({error:'Service IA indisponible.'}));
    return res.status(response.status).json(body);
  }catch{return res.status(502).json({error:'Service IA indisponible. Réessayez plus tard.'});}
}
