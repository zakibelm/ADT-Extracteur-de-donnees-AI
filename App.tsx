
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Sparkles, AlertCircle, Loader2, ShieldCheck, Cpu, MessageSquare, X, Brain, CheckCircle2 } from 'lucide-react';
import Layout from './components/Layout';
import DataView from './components/DataView';
import Auth from './components/Auth';
import { DocumentType, ExtractionResult, ExtractionRow } from './types';
import { extractDataWithGemini } from './services/geminiService';
import { supabase } from './services/supabaseService';

interface FileState {
  file: File;
  preview: string;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
}

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [docType, setDocType] = useState<DocumentType>(DocumentType.TCT);
  
  const [files, setFiles] = useState<FileState[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [promptTCT, setPromptTCT] = useState(() => localStorage.getItem('adt_prompt_tct') || '');
  const [promptOlymel, setPromptOlymel] = useState(() => localStorage.getItem('adt_prompt_olymel') || '');

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
      } catch (err) { console.error(err); } 
      finally { setIsAuthLoading(false); }
    };
    initAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => subscription.unsubscribe();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setError(null);
      setResult(null);
      selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          // Fix: Ensure result is treated as a string before using it
          const resultString = event.target?.result as string;
          if (resultString) {
            setFiles(prev => [...prev, {
              file,
              preview: resultString,
              id: Math.random().toString(36).substr(2, 9),
              status: 'pending',
              progress: 0
            }]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));

  const handleExtraction = async () => {
    if (files.length === 0 || isExtracting) return;
    
    setIsExtracting(true);
    setError(null);
    
    try {
      const extractionPromises = files.map(async (fileObj) => {
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'processing', progress: 10 } : f));
        
        try {
          // Simulation de progression pour l'UX car le modèle Pro est plus lent
          const progressInterval = setInterval(() => {
            setFiles(prev => prev.map(f => {
              if (f.id === fileObj.id && f.status === 'processing' && f.progress < 90) {
                return { ...f, progress: f.progress + 2 };
              }
              return f;
            }));
          }, 500);

          const rows = await extractDataWithGemini(fileObj.preview, docType);
          
          clearInterval(progressInterval);
          setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'completed', progress: 100 } : f));
          
          return rows.map((r: any) => ({
            ...r,
            id: Math.random().toString(36).substr(2, 9),
            source_file: fileObj.file.name
          }));
        } catch (err: any) {
          setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error', progress: 0 } : f));
          return [];
        }
      });

      const allResults = await Promise.all(extractionPromises);
      const flattenedRows = allResults.flat();

      if (flattenedRows.length === 0) throw new Error("L'IA n'a trouvé aucune donnée valide. Vérifiez la qualité de l'image.");

      setResult({
        rows: flattenedRows as ExtractionRow[],
        timestamp: new Date().toISOString(),
        modelUsed: 'gemini-3-pro-preview',
        docType: docType
      });
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  if (isAuthLoading) return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-primary-500" size={40} />
    </div>
  );

  if (!session) return <Auth />;

  return (
    <Layout activeSection={activeSection} setActiveSection={setActiveSection}>
      {activeSection === 'dashboard' && (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <header>
            <h2 className="text-3xl font-bold text-white mb-2">Bonjour 👋</h2>
            <p className="text-slate-400">Extraction de haute précision avec <span className="text-primary-400 font-mono">Gemini Pro</span></p>
          </header>
          <div className="bg-gradient-to-br from-primary-900/40 to-dark-900 border border-primary-500/20 p-8 rounded-3xl shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-6">Nouvelle Extraction</h3>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => { setDocType(DocumentType.TCT); setActiveSection('tct'); setFiles([]); setResult(null); }} className="px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-primary-600/20">Documents TCT</button>
              <button onClick={() => { setDocType(DocumentType.OLYMEL); setActiveSection('olymel'); setFiles([]); setResult(null); }} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold border border-slate-700 transition-all">Assignations Olymel</button>
            </div>
          </div>
        </div>
      )}

      {(activeSection === 'tct' || activeSection === 'olymel') && (
        <div className="flex-1 flex flex-col p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Extraction {docType}</h2>
            {result && <button onClick={() => { setFiles([]); setResult(null); }} className="text-slate-400 hover:text-white text-sm font-medium">Nouvelle session</button>}
          </div>

          {!result ? (
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
              <div className={`flex-1 border-2 border-dashed rounded-3xl transition-all flex flex-col items-center justify-center p-8 text-center group cursor-pointer relative overflow-y-auto ${files.length > 0 ? 'border-primary-500/30 bg-primary-600/5' : 'border-slate-800 bg-dark-900/50 hover:border-slate-700'}`} onClick={() => fileInputRef.current?.click()}>
                <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                
                {files.length === 0 ? (
                  <>
                    <Upload size={48} className="text-slate-600 mb-4 group-hover:text-primary-400" />
                    <h4 className="text-xl font-bold text-white">Importer des fichiers</h4>
                    <p className="text-sm text-slate-500 mt-2">Précision maximale activée</p>
                  </>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full p-4" onClick={(e) => e.stopPropagation()}>
                    {files.map((f) => (
                      <div key={f.id} className="relative group/item bg-dark-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-50">
                        <div className="aspect-[4/3] relative">
                          <img src={f.preview} alt="preview" className="w-full h-full object-cover" />
                          
                          {f.status === 'processing' && (
                            <div className="absolute inset-0 bg-primary-600/40 backdrop-blur-sm flex items-center justify-center">
                              <div className="relative">
                                <Brain size={40} className="text-white animate-pulse" />
                                <div className="absolute -inset-2 bg-white rounded-full animate-ping opacity-20"></div>
                              </div>
                            </div>
                          )}
                          
                          {f.status === 'completed' && (
                            <div className="absolute inset-0 bg-emerald-500/40 backdrop-blur-sm flex items-center justify-center">
                              <CheckCircle2 size={40} className="text-white animate-bounce" />
                            </div>
                          )}
                        </div>

                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] text-white truncate font-medium flex-1">{f.file.name}</p>
                            {!isExtracting && <button onClick={() => removeFile(f.id)} className="text-slate-500 hover:text-red-400 transition-colors"><X size={14} /></button>}
                          </div>
                          
                          <div className="w-full bg-dark-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${f.status === 'error' ? 'bg-red-500' : f.status === 'completed' ? 'bg-emerald-500' : 'bg-primary-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]'}`}
                              style={{ width: `${f.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {!isExtracting && (
                      <button onClick={() => fileInputRef.current?.click()} className="aspect-[4/3] border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:border-primary-500 hover:text-primary-400 transition-all bg-dark-900/50">
                        <Upload size={24} className="mb-2" />
                        <span className="text-xs font-bold uppercase tracking-widest">Ajouter</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="max-w-md mx-auto w-full">
                <button 
                  onClick={handleExtraction} 
                  disabled={files.length === 0 || isExtracting} 
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${isExtracting ? 'bg-slate-800 text-slate-500' : 'bg-primary-600 hover:bg-primary-500 text-white shadow-xl shadow-primary-600/20 active:scale-[0.98]'}`}
                >
                  {isExtracting ? (
                    <><Loader2 className="animate-spin" size={20} /> Extraction en cours...</>
                  ) : (
                    <><Sparkles /> Extraire avec précision ({files.length})</>
                  )}
                </button>
                {error && <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex gap-2 animate-in shake"><AlertCircle size={16} /> {error}</div>}
              </div>
            </div>
          ) : <DataView data={result.rows} docType={result.docType} onSave={() => setActiveSection('dashboard')} />}
        </div>
      )}

      {activeSection === 'settings' && (
        <div className="p-8 max-w-2xl mx-auto space-y-6">
          <header className="border-b border-slate-800 pb-6">
            <h2 className="text-3xl font-bold text-white">Paramètres</h2>
            <p className="text-slate-500 mt-2">Mode haute précision Gemini Pro activé.</p>
          </header>
          <div className="p-6 bg-dark-900 border border-slate-800 rounded-2xl space-y-4">
             <div className="flex items-center gap-3 p-3 bg-primary-600/10 border border-primary-500/20 rounded-xl">
               <ShieldCheck className="text-primary-400" />
               <div>
                 <p className="text-sm font-bold text-white">Précision Maximale</p>
                 <p className="text-[10px] text-slate-400 uppercase">gemini-3-pro-preview</p>
               </div>
             </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
