import React from 'react';
import { LayoutDashboard, Users, GitBranch, BarChart3, Settings, Plus, HelpCircle, LogOut, Package, Wallet, FileText } from 'lucide-react';
import { View } from '../types';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
  companyLogo: string | null;
  companyName: string;
  onToggleDebug?: () => void;
}

export default function Sidebar({ currentView, onViewChange, onLogout, companyLogo, companyName, onToggleDebug }: SidebarProps) {
  const [clickCount, setClickCount] = React.useState(0);

  const handleLogoClick = () => {
    if (!onToggleDebug) return;
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 5) {
      onToggleDebug();
      setClickCount(0);
    }
    // Reset count after 2 seconds of inactivity
    setTimeout(() => setClickCount(0), 2000);
  };
  const navItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'contacts', label: 'Cadastro de Cliente', icon: Users },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'finance', label: 'Finanças', icon: Wallet },
    { id: 'invoices', label: 'Notas Fiscais', icon: FileText },
    { id: 'pipeline', label: 'Pipeline', icon: GitBranch },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ] as const;

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-low dark:bg-slate-900 flex flex-col py-8 z-50">
      <div 
        className="px-8 mb-10 flex items-center gap-3 cursor-pointer select-none"
        onClick={handleLogoClick}
      >
        {companyLogo ? (
          <div className="w-14 h-14 rounded-xl overflow-hidden shadow-sm border border-outline-variant/10 shrink-0">
            <img src={companyLogo} alt="Logo" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-primary font-bold text-2xl">C</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold tracking-tighter text-on-background dark:text-white font-headline leading-none truncate">
            {companyName.split(' ')[0]}
          </h1>
          <p className="text-[8px] uppercase tracking-widest text-secondary font-bold truncate">
            {companyName.split(' ').slice(1).join(' ')}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id || 
                          (item.id === 'contacts' && (currentView === 'contact-detail' || currentView === 'contact-form')) ||
                          (item.id === 'products' && currentView === 'product-form') ||
                          (item.id === 'finance' && currentView === 'finance-form') ||
                          (item.id === 'invoices' && currentView === 'invoice-form');
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center px-8 py-3 font-headline text-sm font-semibold tracking-tight transition-all duration-200",
                isActive 
                  ? "bg-surface-container-lowest dark:bg-slate-800 text-primary dark:text-blue-300 rounded-l-full ml-4 shadow-sm" 
                  : "text-secondary dark:text-slate-400 hover:text-on-background hover:bg-surface-container dark:hover:bg-slate-800"
              )}
            >
              <item.icon className={cn("w-5 h-5 mr-4", isActive ? "text-primary" : "text-secondary")} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-8 space-y-4">
        <div className="pt-6 space-y-1 border-t border-outline-variant/20">
          <button className="w-full flex items-center py-2 text-xs font-semibold text-secondary hover:text-primary transition-colors">
            <HelpCircle className="w-4 h-4 mr-2" />
            Ajuda
          </button>
          <button 
            onClick={onLogout}
            className="w-full flex items-center py-2 text-xs font-semibold text-secondary hover:text-error transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
