import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Sparkles,
  AlertCircle,
  Loader2,
  ShieldCheck,
  X,
  CheckCircle2,
  ArrowUpRight,
  FileText,
  Layers,
  ArrowRight,
} from "lucide-react";
import Layout from "./components/Layout";
import DataView from "./components/DataView";
import Auth from "./components/Auth";
import Admin from "./components/Admin";
import { DocumentType, ExtractionResult, ExtractionRow } from "./types";
import { extractDataWithGemini } from "./services/geminiService";
import { supabase, isAdtAdmin } from "./services/supabaseService";

interface FileState {
  file: File;
  preview: string;
  id: string;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
}

function PasswordSetup({token, onDone}: {token: string | null; onDone: () => void}) {
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('Vérification du lien…');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const verification = useRef<Promise<any> | null>(null);
  useEffect(() => {
    sessionStorage.setItem('adt_recovery_pending', 'true');
    history.replaceState(null, '', location.pathname + location.search);
    if (!verification.current) verification.current = token
      ? supabase.auth.verifyOtp({token_hash: token, type: 'recovery'})
      : supabase.auth.getUser();
    let alive = true;
    verification.current.then(({data, error}) => {
      if (!alive) return;
      if (error || !data.user) {setMessage('Lien expiré ou invalide. Demandez un nouveau lien d’activation.');return;}
      setReady(true); setMessage('Choisissez un mot de passe personnel de 12 caractères minimum. Votre ID employé reste distinct.');
    });
    return () => {alive = false;};
  }, [token]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 12 || password !== confirmation) {setMessage('Les mots de passe doivent être identiques et contenir au moins 12 caractères.');return;}
    setBusy(true);
    const {error} = await supabase.auth.updateUser({password});
    setBusy(false);
    if (error) {setMessage('Mot de passe refusé. Vérifiez les règles ou demandez un nouveau lien.');return;}
    setPassword('');setConfirmation('');sessionStorage.removeItem('adt_recovery_pending');onDone();
  }
  return <main className="auth-main"><section className="auth-form-wrap"><p className="eyebrow">ACTIVATION ADT</p><h1>Définir mon mot de passe</h1><p role="status">{message}</p>
    {ready && <form className="auth-form" onSubmit={submit}>
      <label htmlFor="new-password">Nouveau mot de passe</label><input id="new-password" autoComplete="new-password" type="password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)} />
      <label htmlFor="confirm-password">Confirmer le mot de passe</label><input id="confirm-password" autoComplete="new-password" type="password" minLength={12} required value={confirmation} onChange={e=>setConfirmation(e.target.value)} />
      <button className="button button-primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Activer mon accès'}</button>
    </form>}
  </section></main>;
}

const App: React.FC = () => {
  const [recoveryToken] = useState(() => new URLSearchParams(location.hash.slice(1)).get('adt_recovery'));
  const [isRecovery, setIsRecovery] = useState(() => !!recoveryToken || sessionStorage.getItem('adt_recovery_pending') === 'true');
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [docType, setDocType] = useState<DocumentType>(DocumentType.TCT);

  const [files, setFiles] = useState<FileState[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        setSession(currentSession);
      } catch (err) {
        console.error(err);
      } finally {
        setIsAuthLoading(false);
      }
    };
    initAuth();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    if (selectedFiles.length > 0) {
      setError(null);
      setResult(null);
      selectedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          // Fix: Ensure result is treated as a string before using it
          const resultString = event.target?.result as string;
          if (resultString) {
            setFiles((prev) => [
              ...prev,
              {
                file,
                preview: resultString,
                id: Math.random().toString(36).substr(2, 9),
                status: "pending",
                progress: 0,
              },
            ]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  const handleExtraction = async () => {
    if (files.length === 0 || isExtracting) return;

    setIsExtracting(true);
    setError(null);

    try {
      const extractionPromises = files.map(async (fileObj) => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileObj.id
              ? { ...f, status: "processing", progress: 10 }
              : f,
          ),
        );

        let progressInterval: ReturnType<typeof setInterval> | undefined;
        try {
          // Simulation de progression pour l'UX car le modèle Pro est plus lent
          progressInterval = setInterval(() => {
            setFiles((prev) =>
              prev.map((f) => {
                if (
                  f.id === fileObj.id &&
                  f.status === "processing" &&
                  f.progress < 90
                ) {
                  return { ...f, progress: f.progress + 2 };
                }
                return f;
              }),
            );
          }, 500);

          const rows = await extractDataWithGemini(fileObj.preview, docType);

          clearInterval(progressInterval);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileObj.id
                ? { ...f, status: "completed", progress: 100 }
                : f,
            ),
          );

          return rows.map((r: any) => ({
            ...r,
            id: Math.random().toString(36).substr(2, 9),
            source_file: fileObj.file.name,
          }));
        } catch (err: any) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileObj.id ? { ...f, status: "error", progress: 0 } : f,
            ),
          );
          throw err;
        } finally {
          if (progressInterval) clearInterval(progressInterval);
        }
      });

      const allResults = await Promise.all(extractionPromises);
      const flattenedRows = allResults.flat();

      if (flattenedRows.length === 0)
        throw new Error(
          "L'IA n'a trouvé aucune donnée valide. Vérifiez la qualité de l'image.",
        );

      setResult({
        rows: flattenedRows as ExtractionRow[],
        timestamp: new Date().toISOString(),
        modelUsed: "OpenRouter (serveur)",
        docType: docType,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const openExtraction = (type: DocumentType) => {
    setDocType(type);
    setActiveSection(type === DocumentType.TCT ? "tct" : "olymel");
    setFiles([]);
    setResult(null);
    setError(null);
  };
  const navigate = (section: string) => {
    if (isExtracting) return;
    const type =
      section === "tct"
        ? DocumentType.TCT
        : section === "olymel"
          ? DocumentType.OLYMEL
          : null;
    if (type && type !== docType) {
      openExtraction(type);
      return;
    }
    setActiveSection(section);
  };
  const labels = {
    pending: "Prêt à extraire",
    processing: "Extraction en cours",
    completed: "Traité",
    error: "Échec du traitement",
  };
  if (isRecovery) return <PasswordSetup token={recoveryToken} onDone={() => setIsRecovery(false)} />;
  if (isAuthLoading)
    return (
      <div className="loading-screen" role="status">
        <Loader2 className="spin" size={28} />
        <span>Ouverture de votre espace…</span>
      </div>
    );
  if (!session) return <Auth />;

  return (
    <Layout
      activeSection={activeSection}
      setActiveSection={navigate}
      navigationDisabled={isExtracting}
    >
      <div className="workspace">
        {activeSection === "dashboard" && (
          <>
            <header className="page-header">
              <div>
                <p className="eyebrow">VOTRE ESPACE DE TRAVAIL</p>
                <h1>Du document à la donnée.</h1>
                <p className="muted">
                  Importez vos documents, vérifiez les résultats et préparez vos
                  opérations.
                </p>
              </div>
              <span className="pill">
                <span className="status-dot" /> Espace connecté
              </span>
            </header>
            <section className="hero-panel">
              <div className="hero-copy">
                <span className="eyebrow light">EXTRACTION DOCUMENTAIRE</span>
                <h2>
                  Moins de saisie.
                  <br />
                  Plus de temps sur le terrain.
                </h2>
                <p>
                  Choisissez votre type de document pour commencer une nouvelle
                  extraction.
                </p>
                <button
                  className="button button-white"
                  onClick={() => openExtraction(DocumentType.TCT)}
                >
                  Nouvelle extraction TCT <ArrowUpRight size={18} />
                </button>
              </div>
              <div className="hero-illustration" aria-hidden="true">
                <div className="doc-sheet">
                  <div className="doc-sheet-head">
                    <FileText size={23} />
                    <span>DOCUMENT SOURCE</span>
                  </div>
                  <div className="doc-lines">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="doc-grid">
                    {Array.from({ length: 12 }, (_, i) => (
                      <i key={i} />
                    ))}
                  </div>
                  <span className="doc-stamp">
                    <CheckCircle2 size={15} /> Données structurées
                  </span>
                </div>
                <span className="float-mark">
                  <Layers size={24} />
                </span>
              </div>
            </section>
            <section aria-labelledby="formats-title">
              <div className="section-heading">
                <h2 id="formats-title">
                  Quel document souhaitez-vous traiter ?
                </h2>
                <span className="muted small">2 formats disponibles</span>
              </div>
              <div className="format-grid">
                <button
                  className="format-card"
                  onClick={() => openExtraction(DocumentType.TCT)}
                >
                  <span className="format-icon">
                    <FileText size={23} />
                  </span>
                  <span>
                    <strong>Documents TCT</strong>
                    <span>Tournées, véhicules et affectations</span>
                  </span>
                  <ArrowUpRight size={20} />
                </button>
                <button
                  className="format-card"
                  onClick={() => openExtraction(DocumentType.OLYMEL)}
                >
                  <span className="format-icon olive">
                    <Layers size={23} />
                  </span>
                  <span>
                    <strong>Assignations Olymel</strong>
                    <span>Horaires et assignations de transport</span>
                  </span>
                  <ArrowUpRight size={20} />
                </button>
              </div>
            </section>
            <section
              className="workflow-strip"
              aria-label="Les étapes du traitement"
            >
              {[
                ["01", "Importez", "Sélectionnez vos images"],
                ["02", "Extrayez", "Laissez l’IA lire vos documents"],
                ["03", "Vérifiez", "Ajustez et sauvegardez les lignes"],
              ].map(([n, title, body]) => (
                <div key={n}>
                  <span>{n}</span>
                  <div>
                    <strong>{title}</strong>
                    <p>{body}</p>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
        {(activeSection === "tct" || activeSection === "olymel") && (
          <>
            <header className="page-header">
              <div>
                <p className="eyebrow">EXTRACTION / {docType}</p>
                <h1>
                  {result
                    ? "Vérifiez vos résultats."
                    : "Préparez votre extraction."}
                </h1>
                <p className="muted">
                  {result
                    ? "Relisez les lignes avant de les exporter ou de les sauvegarder."
                    : "Ajoutez une ou plusieurs images de vos documents."}
                </p>
              </div>
              {result && (
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setFiles([]);
                    setResult(null);
                    setError(null);
                  }}
                >
                  Nouvelle session <ArrowRight size={16} />
                </button>
              )}
            </header>
            <ol className="stepper" aria-label="Progression du traitement">
              <li className={!result ? "current" : "done"}>
                <span>1</span> Documents
              </li>
              <li className={isExtracting ? "current" : result ? "done" : ""}>
                <span>2</span> Extraction
              </li>
              <li className={result ? "current" : ""}>
                <span>3</span> Vérification
              </li>
            </ol>
            {!result ? (
              <div className="extraction-grid">
                <section
                  className="panel file-panel"
                  aria-labelledby="files-title"
                >
                  <div className="panel-heading">
                    <h2 id="files-title">Documents source</h2>
                    <span className="count-badge">{files.length}</span>
                  </div>
                  <input
                    type="file"
                    id="source-files"
                    aria-label="Documents source à importer"
                    multiple
                    ref={fileInputRef}
                    className="visually-hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    disabled={isExtracting}
                  />
                  <button
                    className="upload-zone"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExtracting}
                  >
                    <span className="upload-icon">
                      <Upload size={26} />
                    </span>
                    <strong>
                      {files.length
                        ? "Ajouter des documents"
                        : "Importer vos documents"}
                    </strong>
                    <span>
                      Images · sélection de plusieurs fichiers possible
                    </span>
                    <span className="button button-secondary">
                      Parcourir les fichiers <ArrowUpRight size={15} />
                    </span>
                  </button>
                  {files.length > 0 && (
                    <ul className="file-list">
                      {files.map((f) => (
                        <li key={f.id}>
                          <img
                            src={f.preview}
                            alt={`Aperçu de ${f.file.name}`}
                          />
                          <div className="file-info">
                            <strong title={f.file.name}>{f.file.name}</strong>
                            <span className={`file-status ${f.status}`}>
                              {f.status === "processing" && (
                                <Loader2 size={13} className="spin" />
                              )}
                              {f.status === "completed" && (
                                <CheckCircle2 size={13} />
                              )}
                              {labels[f.status]}
                            </span>
                          </div>
                          {!isExtracting && (
                            <button
                              className="icon-button"
                              aria-label={`Retirer ${f.file.name}`}
                              onClick={() => removeFile(f.id)}
                            >
                              <X size={17} />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <aside className="panel session-panel">
                  <p className="eyebrow">VOTRE SESSION</p>
                  <h2>Prêt pour l’extraction</h2>
                  <dl>
                    <div>
                      <dt>Type de document</dt>
                      <dd>{docType}</dd>
                    </div>
                    <div>
                      <dt>Documents importés</dt>
                      <dd>{files.length}</dd>
                    </div>
                    <div>
                      <dt>Traitement</dt>
                      <dd>En parallèle</dd>
                    </div>
                  </dl>
                  <p className="session-note">
                    <ShieldCheck size={18} /> Vous pourrez vérifier et modifier
                    les données avant de les sauvegarder.
                  </p>
                  <button
                    className="button button-primary full-width"
                    disabled={!files.length || isExtracting}
                    onClick={handleExtraction}
                  >
                    {isExtracting ? (
                      <Loader2 size={18} className="spin" />
                    ) : (
                      <Sparkles size={18} />
                    )}
                    {isExtracting
                      ? "Extraction en cours…"
                      : `Extraire ${files.length ? `(${files.length})` : "les données"}`}
                  </button>
                  <p className="small muted" role="status">
                    {isExtracting
                      ? "Le temps de traitement dépend du nombre et de la qualité des images."
                      : "Les résultats s’afficheront après le traitement."}
                  </p>
                  {error && (
                    <div className="notice error" role="alert">
                      <AlertCircle size={17} />
                      <span>{error}</span>
                    </div>
                  )}
                </aside>
              </div>
            ) : (
              <DataView
                data={result.rows}
                docType={result.docType}
                onSave={() => setActiveSection("dashboard")}
              />
            )}
          </>
        )}
        {activeSection === "admin" && (isAdtAdmin(session?.user) ? <Admin /> : <p role="alert">Accès administrateur requis.</p>)}
        {activeSection === "settings" && (
          <>
            <header className="page-header">
              <div>
                <p className="eyebrow">VOTRE ESPACE</p>
                <h1>Paramètres</h1>
                <p className="muted">
                  Informations sur le fonctionnement de l’extraction.
                </p>
              </div>
            </header>
            <section className="panel settings-panel">
              <span className="format-icon">
                <ShieldCheck size={23} />
              </span>
              <h2>Extraction assistée par IA</h2>
              <p className="muted">
                Le traitement utilise la configuration actuelle de votre
                application. Vérifiez toujours les données extraites avant de
                les sauvegarder.
              </p>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
};

export default App;
