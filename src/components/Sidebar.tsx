import React from 'react';
import { LayoutDashboard, Users, GitBranch, BarChart3, Settings, Plus, HelpCircle, LogOut, Package, Wallet, FileText, X, TrendingDown, Plug } from 'lucide-react';
import { View } from '../types';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
  companyLogo: string | null;
  companyName: string;
  privilege: 'Admin' | 'Técnico' | 'Vendedor' | 'Visualizador';
  onToggleDebug?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ currentView, onViewChange, onLogout, companyLogo, companyName, privilege, onToggleDebug, isOpen, onClose }: SidebarProps) {
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
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard, roles: ['Admin', 'Técnico', 'Vendedor', 'Visualizador'] },
    { id: 'contacts', label: 'Cadastro', icon: Users, roles: ['Admin', 'Técnico', 'Vendedor', 'Visualizador'] },
    { id: 'products', label: 'Produtos', icon: Package, roles: ['Admin', 'Técnico', 'Vendedor', 'Visualizador'] },
    { id: 'finance', label: 'Finanças', icon: Wallet, roles: ['Admin', 'Vendedor', 'Visualizador'] },
    { id: 'expenses', label: 'Despesas', icon: TrendingDown, roles: ['Admin', 'Vendedor', 'Visualizador'] },
    { id: 'invoices', label: 'Notas Fiscais', icon: FileText, roles: ['Admin', 'Vendedor', 'Visualizador'] },
    { id: 'pipeline', label: 'Pipeline', icon: GitBranch, roles: ['Admin', 'Vendedor', 'Visualizador'] },
    { id: 'reports', label: 'Relatórios', icon: BarChart3, roles: ['Admin', 'Técnico', 'Vendedor', 'Visualizador'] },
    { id: 'integrations', label: 'Integrações', icon: Plug, roles: ['Admin'] },
    { id: 'settings', label: 'Configurações', icon: Settings, roles: ['Admin'] },
  ] as const;

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <aside className={cn(
        "h-screen w-64 fixed left-0 top-0 bg-surface-container-low flex flex-col py-8 z-50 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between px-8 mb-10">
          <div 
            className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0"
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
              <h1 className="text-lg font-bold tracking-tighter text-on-background font-headline leading-none truncate">
                {companyName.split(' ')[0]}
              </h1>
              <p className="text-[8px] uppercase tracking-widest text-secondary font-bold truncate">
                {companyName.split(' ').slice(1).join(' ')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-secondary hover:text-primary transition-colors rounded-lg hover:bg-surface-container-lowest shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.filter(item => (item.roles as readonly string[]).includes(privilege)).map((item) => {
            const isActive = currentView === item.id || 
                            (item.id === 'contacts' && (currentView === 'contact-detail' || currentView === 'contact-form')) ||
                            (item.id === 'products' && currentView === 'product-form') ||
                            (item.id === 'finance' && currentView === 'finance-form') ||
                            (item.id === 'expenses' && currentView === 'expenses-form') ||
                            (item.id === 'invoices' && currentView === 'invoice-form');
            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center px-8 py-3 font-headline text-sm font-semibold tracking-tight transition-all duration-200",
                  isActive 
                    ? "bg-surface-container-lowest text-primary rounded-l-full ml-4 shadow-sm" 
                    : "text-secondary hover:text-on-background hover:bg-surface-container"
                )}
              >
                <item.icon className={cn("w-5 h-5 mr-4 shrink-0", isActive ? "text-primary" : "text-secondary")} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-8 space-y-4 shrink-0">
          <div className="pt-6 space-y-1 border-t border-outline-variant/20">
            <button className="w-full flex items-center py-2 text-xs font-semibold text-secondary hover:text-primary transition-colors">
              <HelpCircle className="w-4 h-4 mr-2 shrink-0" />
              Ajuda
            </button>
            <button 
              onClick={onLogout}
              className="w-full flex items-center py-2 text-xs font-semibold text-secondary hover:text-error transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2 shrink-0" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
