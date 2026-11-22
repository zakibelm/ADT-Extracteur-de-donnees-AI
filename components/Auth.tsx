import React, { useState } from "react";
import { supabase, internalEmail } from "../services/supabaseService";
import {
  Mail,
  Lock,
  Loader2,
  LogIn,
  UserPlus,
  ArrowLeft,
  KeyRound,
  AlertCircle,
  User,
  Phone,
  Hash,
} from "lucide-react";

const Auth: React.FC = () => {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [dome, setDome] = useState("");
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const getInternalEmail = (domeVal: string) =>
    internalEmail(domeVal);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: getInternalEmail(dome),
          password,
        });
        if (error)
          throw new Error(
            "Dôme ou mot de passe incorrect, ou compte non activé.",
          );
      } else if (mode === "register") {
        const { error, data } = await supabase.auth.signUp({
          email: getInternalEmail(dome),
          password,
          options: {
            data: {
              full_name: fullName,
              real_email: email,
              phone: phone,
              dome: dome,
              employee_id: employeeId,
              numDome: dome,
              employeeId,
            },
          },
        });

        if (error) {
          if (error.message.includes("User already registered")) {
            throw new Error(
              "Ce Dôme est déjà enregistré. Veuillez vous connecter avec votre mot de passe.",
            );
          }
          throw error;
        }

        if (data?.user && data.session === null) {
          setMessage({
            type: "success",
            text: "Inscription reçue. Activation du compte par un administrateur requise.",
          });
        } else {
          setMessage({ type: "success", text: "Compte créé avec succès !" });
        }
        setTimeout(() => setMode("login"), 2000);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-story">
        <a href="#auth-form" className="brand">
          <span className="brand-symbol">
            a<span>↗</span>
          </span>
          <span>
            <strong>ADT.</strong>
            <small>EXTRACTION DE DONNÉES</small>
          </span>
        </a>
        <div>
          <p className="eyebrow light">VOTRE POSTE DE CONTRÔLE</p>
          <h1>
            Vos documents.
            <br />
            Des données claires.
            <br />
            <em>Les opérations avancent.</em>
          </h1>
          <p>
            Transformez vos documents de transport en tableaux prêts à vérifier
            et à utiliser.
          </p>
          <div className="auth-flow">
            <span>01 · Importer</span>
            <span>02 · Extraire</span>
            <span>03 · Vérifier</span>
          </div>
        </div>
        <span className="auth-caption">PENSÉ POUR LE TRAVAIL AU QUOTIDIEN</span>
      </section>
      <section className="auth-main">
        <div className="auth-form-wrap">
          <p className="eyebrow">BIENVENUE DANS VOTRE ESPACE</p>
          <h2>
            {mode === "login" ? "Reprenons le travail." : "Créez votre compte."}
          </h2>
          <p className="muted">
            {mode === "login"
              ? "Connectez-vous avec votre dôme et votre mot de passe."
              : "Renseignez vos informations pour accéder à ADT."}
          </p>
          <form
            id="auth-form"
            onSubmit={handleAuth}
            className="auth-form"
            aria-busy={loading}
          >
            {message && (
              <div
                className={`notice ${message.type}`}
                role={message.type === "error" ? "alert" : "status"}
              >
                <AlertCircle size={18} />
                <span>{message.text}</span>
              </div>
            )}
            <div className="auth-fields">
              <div>
                <label htmlFor="dome">Numéro de dôme</label>
                <input
                  id="dome"
                  type="text"
                  autoComplete="username"
                  required
                  value={dome}
                  onChange={(e) => setDome(e.target.value)}
                  placeholder="Ex. 405"
                />
              </div>
              <div>
                <label htmlFor="account-password">Mot de passe</label>
                <input
                  id="account-password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={mode === "register" ? 12 : undefined}
                  placeholder="Votre mot de passe"
                />
              </div>
            </div>
            {mode === "register" && (
              <>
                <div>
                  <label htmlFor="employee-id">ID employé</label>
                  <input id="employee-id" required value={employeeId} onChange={e => setEmployeeId(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="full-name">Nom complet</label>
                  <input
                    id="full-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="real-email">Adresse courriel</label>
                  <input
                    id="real-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </>
            )}
            <button
              type="submit"
              disabled={loading}
              className="button button-primary full-width"
            >
              {loading ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <LogIn size={18} />
              )}
              {loading
                ? "Veuillez patienter…"
                : mode === "login"
                  ? "Accéder à mon espace"
                  : "Créer mon compte"}
            </button>
          </form>
          <div className="auth-switch">
            <span className="muted">
              {mode === "login" ? "Première visite ?" : "Vous avez un compte ?"}
            </span>
            <button
              className="text-button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setMessage(null);
              }}
            >
              {mode === "login" ? "Créer un compte" : "Se connecter"}
            </button>
          </div>
          <p className="auth-footnote">
            <Lock size={13} /> Accès réservé aux utilisateurs disposant d’un
            compte ADT.
          </p>
        </div>
      </section>
    </div>
  );
};
export default Auth;
