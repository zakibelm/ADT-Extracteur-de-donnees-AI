import React, { useState } from "react";
import {
  Check,
  Edit2,
  Save,
  FileText,
  Table as TableIcon,
  AlertCircle,
  CloudUpload,
  Loader2,
  FileCode,
} from "lucide-react";
import { TCT_COLUMNS, OLYMEL_COLUMNS } from "../constants";
import { DocumentType, ExtractionRow } from "../types";
import { saveExtractionToSupabase } from "../services/supabaseService";

interface DataViewProps {
  data: ExtractionRow[];
  docType: DocumentType;
  onSave: (data: ExtractionRow[]) => void;
}

const DataView: React.FC<DataViewProps> = ({ data, docType, onSave }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedRows, setEditedRows] = useState<ExtractionRow[]>(data);
  const [saveRequestId] = useState(() => crypto.randomUUID());
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );

  const columns = docType === DocumentType.TCT ? TCT_COLUMNS : OLYMEL_COLUMNS;

  const handleEditChange = (id: string, key: string, value: string) => {
    setEditedRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  };

  const handleSupabaseSync = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      await saveExtractionToSupabase(editedRows, docType, saveRequestId);
      setSaveStatus("success");
      setTimeout(() => onSave(editedRows), 1500);
    } catch (err) {
      setSaveStatus("error");
      alert(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = columns.map((c) => c.label).join(",");
    const rows = editedRows
      .map((row) =>
        columns.map((c) => `"${(row as any)[c.key] || ""}"`).join(","),
      )
      .join("\n");

    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `extraction_${docType.toLowerCase()}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isEmpty = editedRows.length === 0;

  return (
    <section className="results-panel" aria-labelledby="results-title">
      <div className="results-toolbar">
        <div>
          <p className="eyebrow">VÉRIFICATION DES DONNÉES</p>
          <h2 id="results-title">
            Résultats de l’extraction{" "}
            <span className="count-badge">{editedRows.length}</span>
          </h2>
          <p className="muted small">
            Modifiez une ligne avec le crayon, puis exportez ou sauvegardez vos
            données.
          </p>
        </div>
        {!isEmpty && (
          <div className="toolbar-actions">
            <button
              className="button button-secondary"
              onClick={handleExportCSV}
            >
              <FileText size={17} /> Exporter CSV
            </button>
            <button
              className="button button-primary"
              onClick={handleSupabaseSync}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 size={17} className="spin" />
              ) : saveStatus === "success" ? (
                <Check size={17} />
              ) : (
                <CloudUpload size={17} />
              )}
              {isSaving
                ? "Sauvegarde…"
                : saveStatus === "success"
                  ? "Enregistré !"
                  : "Sauvegarder"}
            </button>
          </div>
        )}
      </div>
      {saveStatus === "error" && (
        <p className="notice error" role="alert">
          La sauvegarde a échoué. Vos données restent disponibles dans ce
          tableau.
        </p>
      )}
      {saveStatus === "success" && (
        <p className="notice success" role="status">
          Les données ont été enregistrées.
        </p>
      )}
      <div
        className="table-container"
        role="region"
        aria-label="Tableau des données extraites, défilement horizontal disponible"
        tabIndex={0}
      >
        {isEmpty ? (
          <div className="empty-state">
            <AlertCircle size={32} />
            <h3>Aucune donnée extraite</h3>
            <p>Essayez une image plus lisible.</p>
          </div>
        ) : (
          <table>
            <caption className="visually-hidden">
              Données extraites des documents {docType}
            </caption>
            <thead>
              <tr>
                <th scope="col">Nº</th>
                <th scope="col">Document source</th>
                {columns.map((col) => (
                  <th scope="col" key={col.key}>
                    {col.label}
                  </th>
                ))}
                <th scope="col" className="sticky-action">
                  Modifier
                </th>
              </tr>
            </thead>
            <tbody>
              {editedRows.map((row, idx) => (
                <tr key={row.id}>
                  <td className="row-number">
                    {String(idx + 1).padStart(2, "0")}
                  </td>
                  <td className="source-cell" title={(row as any).source_file}>
                    {(row as any).source_file || "Inconnu"}
                  </td>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {editingId === row.id ? (
                        <input
                          type="text"
                          aria-label={`${col.label}, ligne ${idx + 1}`}
                          value={(row as any)[col.key] || ""}
                          onChange={(e) =>
                            handleEditChange(row.id, col.key, e.target.value)
                          }
                        />
                      ) : (
                        <span className="table-value">
                          {(row as any)[col.key] || (
                            <span className="empty-value">—</span>
                          )}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="sticky-action">
                    <button
                      className="icon-button"
                      aria-label={
                        editingId === row.id
                          ? `Terminer la modification de la ligne ${idx + 1}`
                          : `Modifier la ligne ${idx + 1}`
                      }
                      aria-pressed={editingId === row.id}
                      onClick={() =>
                        setEditingId(editingId === row.id ? null : row.id)
                      }
                    >
                      {editingId === row.id ? (
                        <Check size={17} />
                      ) : (
                        <Edit2 size={17} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="table-footer">
        <span>
          {editedRows.length} ligne{editedRows.length > 1 ? "s" : ""} ·{" "}
          {columns.length} champs
        </span>
        <span>Vérifiez les informations avant sauvegarde.</span>
      </div>
    </section>
  );
};
export default DataView;
