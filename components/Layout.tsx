
import React from 'react';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  History, 
  Settings, 
  ChevronRight, 
  LogOut,
  Truck,
  Calendar,
  Layers
} from 'lucide-react';
import { COMPANY_NAME, APP_VERSION } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeSection, setActiveSection }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'tct', label: 'Logistique (TCT)', icon: Truck, subItems: ['Extraction', 'Document Final', 'Rapports'] },
    { id: 'olymel', label: 'Transport (Assignations)', icon: Layers, subItems: ['Extraction', 'Calendrier', 'Rapports'] },
    { id: 'history', label: 'Historique', icon: History },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-dark-950 text-slate-300">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-900 border-r border-slate-800 flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center font-bold text-white">A</div>
            <h1 className="text-xl font-bold text-white tracking-tight">ADT</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium">{COMPANY_NAME}</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuItems.map((item) => (
            <div key={item.id} className="space-y-1">
              <button
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                  activeSection === item.id 
                    ? 'bg-primary-600/10 text-primary-400 border border-primary-600/20' 
                    : 'hover:bg-slate-800/50 text-slate-400'
                }`}
              >
                <item.icon size={20} className={activeSection === item.id ? 'text-primary-400' : 'group-hover:text-slate-200'} />
                <span className="font-medium text-sm">{item.label}</span>
                {item.subItems && <ChevronRight size={14} className={`ml-auto transition-transform ${activeSection === item.id ? 'rotate-90' : ''}`} />}
              </button>
              
              {item.subItems && activeSection === item.id && (
                <div className="ml-9 space-y-1 mt-1">
                  {item.subItems.map((sub) => (
                    <button 
                      key={sub}
                      className="w-full text-left py-1.5 px-2 text-xs text-slate-500 hover:text-slate-200 transition-colors"
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 mt-auto">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-700/50 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">ZB</div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-200 truncate">Zakibelm</p>
              <p className="text-[10px] text-slate-500 truncate">Administrateur</p>
            </div>
          </div>
          <p className="text-[10px] text-center text-slate-600">v{APP_VERSION} • © 2025</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
};

export default Layout;
