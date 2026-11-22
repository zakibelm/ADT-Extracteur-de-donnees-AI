import React, { useEffect, useState } from 'react';
import { loadAdminPage } from '../services/supabaseService';

export default function Admin() {
  const [tab, setTab] = useState<'users' | 'data'>('users');
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{rows: any[]; count: number}>({rows: [], count: 0});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(''); setResult({rows: [], count: 0});
    loadAdminPage(tab, page).then(value => { if (alive) setResult(value); })
      .catch(e => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tab, page, refresh]);
  return <section className="admin-panel">
    <p className="eyebrow">GESTION ADT</p><h1>Administration</h1>
    <p>Consultez les utilisateurs et les données sauvegardées. Les accès sont contrôlés par Supabase.</p>
    <div className="admin-actions">
      <button className="button button-secondary" aria-pressed={tab === 'users'} onClick={() => {setTab('users');setPage(0);}}>Utilisateurs</button>
      <button className="button button-secondary" aria-pressed={tab === 'data'} onClick={() => {setTab('data');setPage(0);}}>Données extraites</button>
      <button className="button button-secondary" disabled={loading} onClick={() => setRefresh(v => v + 1)}>Actualiser</button>
    </div>
    {error && <p role="alert" className="notice error">{error}</p>}
    {loading ? <p role="status">Chargement…</p> : <>
      <p role="status">{result.count} {tab === 'users' ? 'utilisateur(s)' : 'ligne(s) sauvegardée(s)'}</p>
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr>{(tab === 'users' ? ['Nom', 'Dôme', 'ID employé', 'Rôle'] : ['Date document', 'Type', 'Source', 'Utilisateur', 'Données']).map(x => <th key={x} scope="col">{x}</th>)}</tr></thead>
        <tbody>{result.rows.map(row => <tr key={row.id}>{tab === 'users' ? <><td>{row.full_name || '—'}</td><td>{row.dome}</td><td>{row.employee_id}</td><td>{row.account_role === 'admin' ? 'Administrateur' : 'Utilisateur'}</td></> : <><td>{row.schedule_date || 'Non lue'}</td><td>{row.doc_type}</td><td>{row.source_file}</td><td><code>{row.user_id}</code></td><td><details><summary>Voir la ligne</summary><dl>{Object.entries(row.data || {}).map(([key,value]) => <React.Fragment key={key}><dt>{key}</dt><dd>{String(value || '—')}</dd></React.Fragment>)}</dl></details></td></>}</tr>)}</tbody>
      </table></div>
      {!result.rows.length && <p>Aucun enregistrement.</p>}
      <div className="admin-actions"><button className="button button-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Précédent</button><span>Page {page + 1}</span><button className="button button-secondary" disabled={(page + 1) * 25 >= result.count} onClick={() => setPage(p => p + 1)}>Suivant</button></div>
    </>}
  </section>;
}
