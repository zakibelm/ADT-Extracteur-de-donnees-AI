import React from "react";
import {
  LayoutDashboard,
  Settings,
  ShieldCheck,
  LogOut,
  FileText,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
} from "lucide-react";
import { APP_VERSION } from "../constants";
import { supabase, isAdtAdmin } from "../services/supabaseService";

interface LayoutProps {
  children: React.ReactNode;
  activeSection: string;
  setActiveSection: (section: string) => void;
  navigationDisabled?: boolean;
}
const Layout: React.FC<LayoutProps> = ({
  children,
  activeSection,
  setActiveSection,
  navigationDisabled = false,
}) => {
  const [user, setUser] = React.useState<any>(null);
  const [expanded, setExpanded] = React.useState(true);
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);
  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Utilisateur";
  const domeDisplay = user?.user_metadata?.dome
    ? `Dôme ${user.user_metadata.dome}`
    : "Membre ADT";
  const items = [
    { id: "dashboard", label: "Vue d’ensemble", icon: LayoutDashboard },
    { id: "tct", label: "Documents TCT", icon: FileText },
    { id: "olymel", label: "Assignations Olymel", icon: Layers },
  ];
  if (isAdtAdmin(user)) items.push({ id: "admin", label: "Administration", icon: ShieldCheck });
  return (
    <div className={`app-shell ${expanded ? "" : "nav-collapsed"}`}>
      <a className="skip-link" href="#main-content">
        Aller au contenu
      </a>
      <aside className="sidebar" aria-label="Navigation principale">
        <a href="#main-content" className="brand">
          <span className="brand-symbol">
            a<span>↗</span>
          </span>
          <span className="nav-label">
            <strong>
              ADT<span className="brand-dot">.</span>
            </strong>
            <small>EXTRACTION DE DONNÉES</small>
          </span>
        </a>
        <span className="nav-caption nav-label">ESPACE DE TRAVAIL</span>
        <nav>
          {items.map((item) => (
            <button
              key={item.id}
              title={item.label}
              aria-label={item.label}
              disabled={navigationDisabled}
              aria-current={activeSection === item.id ? "page" : undefined}
              className={`nav-item ${activeSection === item.id ? "active" : ""}`}
              onClick={() => setActiveSection(item.id)}
            >
              <item.icon size={19} />
              <span className="nav-label">{item.label}</span>
              {activeSection === item.id && (
                <span className="active-dot nav-label" />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip nav-label">
            <ArrowUpRight size={21} />
            <strong>Du document à l’action.</strong>
            <p>Vos opérations commencent avec des données lisibles.</p>
          </div>
          <button
            className={`nav-item ${activeSection === "settings" ? "active" : ""}`}
            title="Paramètres"
            aria-label="Paramètres"
            disabled={navigationDisabled}
            aria-current={activeSection === "settings" ? "page" : undefined}
            onClick={() => setActiveSection("settings")}
          >
            <Settings size={19} />
            <span className="nav-label">Paramètres</span>
          </button>
          <div className="user-card">
            <span className="avatar">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="nav-label">
              <strong>{displayName}</strong>
              <small>{domeDisplay}</small>
            </span>
          </div>
          <button
            className="nav-item logout"
            title="Déconnexion"
            aria-label="Déconnexion"
            disabled={navigationDisabled}
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut size={18} />
            <span className="nav-label">Déconnexion</span>
          </button>
          <p className="sidebar-version nav-label">ADT · v{APP_VERSION}</p>
        </div>
      </aside>
      <div className="main-shell">
        <div className="topbar">
          <button
            className="icon-button"
            aria-label={
              expanded ? "Réduire la navigation" : "Déployer la navigation"
            }
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <PanelLeftClose size={20} />
            ) : (
              <PanelLeftOpen size={20} />
            )}
          </button>
          <span>
            Poste de contrôle <span className="topbar-divider">/</span>{" "}
            <strong>
              {activeSection === "dashboard"
                ? "Vue d’ensemble"
                : activeSection === "settings"
                  ? "Paramètres"
                  : "Extraction"}
            </strong>
          </span>
          <span className="topbar-end">ADT WORKSPACE</span>
        </div>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="workspace-footer">
          <span>ADT · Extracteur de données</span>
          <span>Importez. Vérifiez. Avancez.</span>
        </footer>
      </div>
    </div>
  );
};
export default Layout;
