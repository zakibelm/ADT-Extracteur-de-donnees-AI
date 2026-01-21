
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Sparkles, AlertCircle, CheckCircle2, Loader2, ShieldCheck, Key, Cpu, MessageSquare, PlayCircle, Save } from 'lucide-react';
import Layout from './components/Layout';
import DataView from './components/DataView';
import { DocumentType, ExtractionResult } from './types';
import { extractDataWithOpenRouter } from './services/openRouterService';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [docType, setDocType] = useState<DocumentType>(DocumentType.TCT);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // État des paramètres
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('adt_openrouter_key') || '');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('adt_model') || 'anthropic/claude-3.5-sonnet');
  const [promptTCT, setPromptTCT] = useState(() => localStorage.getItem('adt_prompt_tct') || '');
  const [promptOlymel, setPromptOlymel] = useState(() => localStorage.getItem('adt_prompt_olymel') || '');

  // Synchronisation automatique au localStorage
  useEffect(() => { localStorage.setItem('adt_openrouter_key', apiKey); }, [apiKey]);
  useEffect(() => { localStorage.setItem('adt_model', selectedModel); }, [selectedModel]);
  useEffect(() => { localStorage.setItem('adt_prompt_tct', promptTCT); }, [promptTCT]);
  useEffect(() => { localStorage.setItem('adt_prompt_olymel', promptOlymel); }, [promptOlymel]);

  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const testConnection = async () => {
    if (!apiKey) return;
    setIsTestingKey(true);
    setTestStatus('idle');
    try {
      const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      if (response.ok) setTestStatus('success');
      else setTestStatus('error');
    } catch (err) {
      setTestStatus('error');
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
      const reader = new FileReader();
      reader.onload = (event) => setPreview(event.target?.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleExtraction = async () => {
    if (!preview) return;
    setIsExtracting(true);
    setError(null);
    try {
      const extractedRows = await extractDataWithOpenRouter(preview, docType);
      const rowsWithIds = extractedRows.map((r: any) => ({
        ...r,
        id: Math.random().toString(36).substr(2, 9)
      }));
      setResult({
        rows: rowsWithIds,
        timestamp: new Date().toISOString(),
        modelUsed: selectedModel,
        docType: docType
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const renderDashboard = () => (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Bonjour, Zakibelm 👋</h2>
        <p className="text-slate-400">Prêt pour une nouvelle extraction. Modèle : <span className="text-primary-400 font-mono">{selectedModel.split('/').pop()}</span></p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-dark-900 border border-slate-800 rounded-2xl flex items-center gap-5">
          <div className="p-4 rounded-xl bg-primary-600/10 text-primary-400"><ShieldCheck size={24} /></div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Clé API</p>
            <p className="text-sm font-bold text-white mt-1">{apiKey ? 'Configurée ✅' : 'Non détectée ❌'}</p>
          </div>
        </div>
        <div className="p-6 bg-dark-900 border border-slate-800 rounded-2xl flex items-center gap-5">
          <div className="p-4 rounded-xl bg-blue-600/10 text-blue-400"><Cpu size={24} /></div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Moteur IA</p>
            <p className="text-sm font-bold text-white mt-1 truncate">{selectedModel}</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-primary-900/40 to-dark-900 border border-primary-500/20 p-8 rounded-3xl">
        <h3 className="text-2xl font-bold text-white mb-6">Nouvelle Extraction</h3>
        <div className="flex flex-wrap gap-4">
          <button onClick={() => { setDocType(DocumentType.TCT); setActiveSection('tct'); }} className="px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-primary-600/20">Documents TCT</button>
          <button onClick={() => { setDocType(DocumentType.OLYMEL); setActiveSection('olymel'); }} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold border border-slate-700 transition-all">Assignations Olymel</button>
        </div>
      </div>
    </div>
  );

  const renderExtractionFlow = () => (
    <div className="flex-1 flex flex-col p-8 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Extraction {docType}</h2>
        {result && <button onClick={() => { setFile(null); setPreview(null); setResult(null); }} className="text-slate-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"><AlertCircle size={16} /> Nouveau document</button>}
      </div>

      {!result ? (
        <div className="flex-1 flex flex-col gap-6">
          <div className={`flex-1 border-2 border-dashed rounded-3xl transition-all flex flex-col items-center justify-center p-12 text-center group cursor-pointer ${file ? 'border-primary-500/50 bg-primary-600/5' : 'border-slate-800 bg-dark-900/50 hover:border-slate-700'}`} onClick={() => !file && fileInputRef.current?.click()}>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
            {!file ? <><Upload size={48} className="text-slate-600 mb-4 group-hover:text-primary-400" /><h4 className="text-xl font-bold text-white">Importer un fichier</h4><p className="text-sm text-slate-500 mt-2">Cliquez ou glissez une image/PDF</p></> : <img src={preview!} alt="Preview" className="max-w-full max-h-[500px] object-contain rounded-xl border border-slate-700 shadow-2xl" />}
          </div>
          <div className="max-w-md mx-auto w-full">
            <button onClick={handleExtraction} disabled={!file || isExtracting || !apiKey} className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all bg-primary-600 hover:bg-primary-500 text-white disabled:bg-slate-800 disabled:text-slate-500">
              {isExtracting ? <><Loader2 className="animate-spin" /> Analyse en cours...</> : <><Sparkles /> Extraire avec l'IA</>}
            </button>
            {error && <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex gap-2"><AlertCircle size={16} className="shrink-0" /> {error}</div>}
          </div>
        </div>
      ) : <DataView data={result.rows} docType={result.docType} onSave={() => setActiveSection('dashboard')} />}
    </div>
  );

  return (
    <Layout activeSection={activeSection} setActiveSection={setActiveSection}>
      {activeSection === 'dashboard' && renderDashboard()}
      {(activeSection === 'tct' || activeSection === 'olymel') && renderExtractionFlow()}
      {activeSection === 'settings' && (
        <div className="p-8 max-w-5xl mx-auto space-y-8 h-full overflow-y-auto">
          <header className="border-b border-slate-800 pb-6">
            <h2 className="text-3xl font-bold text-white">Paramètres</h2>
            <p className="text-slate-500 mt-2">Configuration de l'IA et des clés API. Les modifications sont enregistrées en temps réel.</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
            <div className="space-y-6">
              <section className="p-6 bg-dark-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest"><Key size={16} className="text-primary-400" /> Clé OpenRouter</h3>
                  {testStatus === 'success' && <span className="text-[10px] text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded">VALIDE</span>}
                </div>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-dark-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-primary-500 transition-all font-mono text-sm"
                />
                <button onClick={testConnection} disabled={isTestingKey || !apiKey} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all">
                  {isTestingKey ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />} Vérifier la clé
                </button>
              </section>

              <section className="p-6 bg-dark-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest"><Cpu size={16} className="text-primary-400" /> Modèle d'extraction</h3>
                <input 
                  type="text" 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-dark-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm font-mono focus:border-primary-500"
                />
                <div className="flex flex-wrap gap-2">
                  {['anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash-001', 'openai/gpt-4o'].map(m => (
                    <button key={m} onClick={() => setSelectedModel(m)} className={`text-[10px] px-3 py-2 rounded-lg border transition-all ${selectedModel === m ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-600/20' : 'bg-dark-950 border-slate-800 text-slate-500'}`}>{m.split('/').pop()}</button>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="p-6 bg-dark-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest"><MessageSquare size={16} className="text-primary-400" /> Prompt TCT</h3>
                <textarea 
                  rows={4}
                  value={promptTCT}
                  onChange={(e) => setPromptTCT(e.target.value)}
                  placeholder="Instructions spécifiques pour les tableaux TCT..."
                  className="w-full bg-dark-950 border border-slate-800 rounded-xl px-4 py-3 text-[11px] font-sans text-slate-300 focus:border-primary-500"
                />
              </section>

              <section className="p-6 bg-dark-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest"><MessageSquare size={16} className="text-primary-400" /> Prompt Olymel</h3>
                <textarea 
                  rows={4}
                  value={promptOlymel}
                  onChange={(e) => setPromptOlymel(e.target.value)}
                  placeholder="Instructions spécifiques pour les assignations Olymel..."
                  className="w-full bg-dark-950 border border-slate-800 rounded-xl px-4 py-3 text-[11px] font-sans text-slate-300 focus:border-primary-500"
                />
              </section>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
