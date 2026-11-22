import React, { useState } from 'react';
import { requestMemberActivation, requestMemberRecovery, signInMember } from '../services/supabaseService';
import { Lock, Loader2, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';

export function PasswordField({id,label,value,onChange,minLength}: {id:string;label:string;value:string;onChange:(value:string)=>void;minLength?:number}) {
  const [visible,setVisible] = useState(false);
  return <div><label htmlFor={id}>{label}</label><div className="password-input">
    <input id={id} type={visible ? 'text' : 'password'} autoComplete={minLength ? 'new-password' : 'current-password'} minLength={minLength} required value={value} onChange={e=>onChange(e.target.value)} />
    <button type="button" className="password-toggle" aria-controls={id} aria-pressed={visible} aria-label={visible ? `Masquer : ${label}` : `Afficher : ${label}`} onClick={()=>setVisible(v=>!v)}>{visible ? <EyeOff size={19}/> : <Eye size={19}/>}</button>
  </div></div>;
}

export default function Auth() {
  const [mode,setMode] = useState<'login'|'register'|'forgot'>('login');
  const [loading,setLoading] = useState(false);
  const [message,setMessage] = useState<{type:'success'|'error';text:string}|null>(null);
  const [dome,setDome] = useState('');
  const [employeeId,setEmployeeId] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();setLoading(true);setMessage(null);
    try {
      if(mode==='login') await signInMember(dome,email,password);
      else {
        if(mode==='register') await requestMemberActivation(dome,employeeId,email);
        else await requestMemberRecovery(email);
        setMessage({type:'success',text:'Si la demande est admissible, vous recevrez un lien à cette adresse. Ouvrez-le pour choisir votre mot de passe. Vérifiez aussi les courriels indésirables.'});
      }
    } catch(e:any) {setMessage({type:'error',text:e.message});}
    finally {setLoading(false);}
  }
  function changeMode(next: typeof mode) {setMode(next);setMessage(null);setPassword('');}
  return <div className="auth-layout">
    <section className="auth-story"><a href="#auth-form" className="brand"><span className="brand-symbol">a<span>↗</span></span><span><strong>ADT.</strong><small>EXTRACTION DE DONNÉES</small></span></a>
      <div><p className="eyebrow light">VOTRE POSTE DE CONTRÔLE</p><h1>Vos documents.<br/>Des données claires.<br/><em>Les opérations avancent.</em></h1><p>Transformez vos documents de transport en tableaux prêts à vérifier et à utiliser.</p><div className="auth-flow"><span>01 · Importer</span><span>02 · Extraire</span><span>03 · Vérifier</span></div></div><span className="auth-caption">PENSÉ POUR LE TRAVAIL AU QUOTIDIEN</span>
    </section>
    <section className="auth-main"><div className="auth-form-wrap"><p className="eyebrow">BIENVENUE DANS VOTRE ESPACE</p>
      <h2>{mode==='login' ? 'Reprenons le travail.' : mode==='register' ? 'Activez votre compte.' : 'Retrouvez votre accès.'}</h2>
      <p className="muted">{mode==='login' ? 'Votre dôme, votre courriel et votre mot de passe personnel.' : mode==='register' ? 'Renseignez votre dôme, votre ID employé et votre courriel. Vous choisirez votre mot de passe depuis le lien reçu.' : 'Recevez un lien pour définir un nouveau mot de passe.'}</p>
      <form id="auth-form" className="auth-form" onSubmit={submit} aria-busy={loading}>
        {message && <div className={`notice ${message.type}`} role={message.type==='error'?'alert':'status'}><AlertCircle size={18}/><span>{message.text}</span></div>}
        {mode!=='forgot' && <div><label htmlFor="dome">Numéro de dôme</label><input id="dome" inputMode="numeric" pattern="[0-9]{1,12}" required value={dome} onChange={e=>setDome(e.target.value)} placeholder="Ex. 424" /></div>}
        {mode==='register' && <div><label htmlFor="employee-id">ID employé</label><input id="employee-id" inputMode="numeric" pattern="[0-9]{1,12}" required value={employeeId} onChange={e=>setEmployeeId(e.target.value)} /><small className="muted">Votre ID employé est un identifiant, pas votre mot de passe.</small></div>}
        <div><label htmlFor="account-email">Adresse courriel</label><input id="account-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
        {mode==='login' && <PasswordField id="account-password" label="Mot de passe" value={password} onChange={setPassword}/>}
        <button className="button button-primary full-width" disabled={loading}>{loading ? <Loader2 className="spin" size={18}/> : <LogIn size={18}/>} {loading ? 'Veuillez patienter…' : mode==='login' ? 'Accéder à mon espace' : mode==='register' ? 'Recevoir mon lien d’activation' : 'Recevoir mon lien de réinitialisation'}</button>
      </form>
      <div className="auth-switch"><span className="muted">{mode==='login'?'Première visite ?':'Vous avez un compte ?'}</span><button className="text-button" onClick={()=>changeMode(mode==='login'?'register':'login')}>{mode==='login'?'Créer un compte':'Se connecter'}</button></div>
      {mode==='login' && <button className="text-button" onClick={()=>changeMode('forgot')}>Mot de passe oublié ou accès à activer ?</button>}
      <p className="auth-footnote"><Lock size={13}/> Accès réservé aux utilisateurs disposant d’un compte ADT.</p>
    </div></section>
  </div>;
}
