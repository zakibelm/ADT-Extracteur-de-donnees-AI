
import React, { useState } from 'react';
import { Check, X, Edit2, Save, Download, FileText, Table as TableIcon, AlertCircle } from 'lucide-react';
import { TCT_COLUMNS, OLYMEL_COLUMNS } from '../constants';
import { DocumentType, ExtractionRow } from '../types';

interface DataViewProps {
  data: ExtractionRow[];
  docType: DocumentType;
  onSave: (data: ExtractionRow[]) => void;
}

const DataView: React.FC<DataViewProps> = ({ data, docType, onSave }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedRows, setEditedRows] = useState<ExtractionRow[]>(data);

  const columns = docType === DocumentType.TCT ? TCT_COLUMNS : OLYMEL_COLUMNS;

  const handleEditChange = (id: string, key: string, value: string) => {
    setEditedRows(prev => prev.map(row => 
      row.id === id ? { ...row, [key]: value } : row
    ));
  };

  const handleExportCSV = () => {
    const headers = columns.map(c => c.label).join(',');
    const rows = editedRows.map(row => 
      columns.map(c => `"${(row as any)[c.key] || ''}"`).join(',')
    ).join('\n');
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `extraction_${docType.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isEmpty = editedRows.length === 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-600/20 rounded-lg text-primary-400">
            <TableIcon size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Résultats d'Extraction</h3>
            <p className="text-xs text-slate-500">{editedRows.length} lignes détectées pour {docType}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isEmpty && (
            <>
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all text-sm font-medium"
              >
                <FileText size={16} />
                Exporter CSV
              </button>
              <button 
                onClick={() => onSave(editedRows)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-all text-sm font-semibold shadow-lg shadow-primary-600/20"
              >
                <Save size={16} />
                Confirmer
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-dark-900 shadow-2xl">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-slate-500">
            <AlertCircle size={48} className="mb-4 opacity-20" />
            <p>Aucune donnée n'a été extraite.</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-sm text-left">
            <thead className="sticky top-0 bg-dark-800 border-b border-slate-700 z-10">
              <tr>
                <th className="p-4 w-12 text-center text-slate-500 font-medium">#</th>
                {columns.map(col => (
                  <th key={col.key} className="p-4 text-slate-400 font-semibold whitespace-nowrap min-w-[150px]">
                    {col.label}
                  </th>
                ))}
                <th className="p-4 w-12 sticky right-0 bg-dark-800 border-l border-slate-700"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {editedRows.map((row, idx) => (
                <tr key={row.id} className="group hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-center text-slate-600 font-mono text-xs">{idx + 1}</td>
                  {columns.map(col => (
                    <td key={col.key} className="p-2">
                      {editingId === row.id ? (
                        <input 
                          type="text"
                          value={(row as any)[col.key] || ''}
                          onChange={(e) => handleEditChange(row.id, col.key, e.target.value)}
                          className="w-full bg-dark-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-primary-500"
                        />
                      ) : (
                        <div className="px-2 py-1.5 whitespace-nowrap truncate max-w-xs text-slate-300">
                          {(row as any)[col.key] ? (row as any)[col.key] : <span className="text-slate-700 italic text-[10px]">vide</span>}
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="p-4 sticky right-0 group-hover:bg-slate-800/30 transition-colors border-l border-slate-800/50 bg-dark-900/80 backdrop-blur-sm">
                    <button 
                      onClick={() => setEditingId(editingId === row.id ? null : row.id)}
                      className="p-1.5 text-slate-500 hover:text-primary-400 transition-colors"
                    >
                      {editingId === row.id ? <Check size={16} /> : <Edit2 size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DataView;
