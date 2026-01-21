
import React, { useState } from 'react';
import { supabase } from '../services/supabaseService';
import { Mail, Lock, Loader2, LogIn, UserPlus, ArrowLeft, KeyRound, AlertCircle, User, Phone, Hash } from 'lucide-react';

const Auth: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [dome, setDome] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const getInternalEmail = (domeVal: string) => `${domeVal.toLowerCase().trim()}@adt.system`;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ 
          email: getInternalEmail(dome), 
          password: employeeId 
        });
        if (error) throw new Error("Dôme ou ID employé incorrect. Si vous n'avez pas de compte, cliquez sur 'S'inscrire ici'.");
      } else if (mode === 'register') {
        const { error, data } = await supabase.auth.signUp({ 
          email: getInternalEmail(dome), 
          password: employeeId,
          options: {
            data: {
              full_name: fullName,
              real_email: email,
              phone: phone,
              dome: dome,
              employee_id: employeeId
            }
          }
        });
        
        if (error) {
          if (error.message.includes('User already registered')) {
            throw new Error("Ce Dôme est déjà enregistré. Veuillez vous connecter avec votre ID employé.");
          }
          throw error;
        }

        if (data?.user && data.session === null) {
          setMessage({ type: 'success', text: 'Inscription réussie ! Vous pouvez maintenant vous connecter.' });
        } else {
          setMessage({ type: 'success', text: 'Compte créé avec succès !' });
        }
        setTimeout(() => setMode('login'), 2000);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dark-950">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-xl shadow-primary-600/20">
            <KeyRound className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Connexion ADT' : mode === 'register' ? 'Créer un compte' : 'Récupération'}
          </h2>
          <p className="text-slate-500 mt-2">
            {mode === 'login' ? 'Entrez votre Dôme et ID Employé' : 'Complétez votre profil chauffeur'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="bg-dark-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-5">
          {message && (
            <div className={`p-4 rounded-xl flex items-start gap-3 text-sm animate-in slide-in-from-top-2 ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{message.text}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Dôme</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    type="text" required value={dome}
                    onChange={(e) => setDome(e.target.value)}
                    className="w-full bg-dark-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-slate-200 focus:border-primary-500 outline-none text-sm"
                    placeholder="Ex: 405"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">ID Employé</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    type="password" required value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full bg-dark-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-slate-200 focus:border-primary-500 outline-none text-sm"
                    placeholder="••••"
                  />
                </div>
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nom Complet</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input 
                      type="text" required value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-dark-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-slate-200 focus:border-primary-500 outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Email Réel</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input 
                      type="email" required value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-dark-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-slate-200 focus:border-primary-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : mode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
            {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')} 
            className="text-sm text-slate-500 hover:text-primary-400"
          >
            {mode === 'login' ? "Pas encore de compte ? S'inscrire ici" : "Déjà un compte ? Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
