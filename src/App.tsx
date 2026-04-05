import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';
import Pipeline from './components/Pipeline';
import Contacts from './components/Contacts';
import ContactDetail from './components/ContactDetail';
import ContactForm from './components/ContactForm';
import Products from './components/Products';
import ProductForm from './components/ProductForm';
import Finance from './components/Finance';
import FinanceForm from './components/FinanceForm';
import Invoices from './components/Invoices';
import InvoiceForm from './components/InvoiceForm';
import Settings from './components/Settings';
import Reports from './components/Reports';
import ErrorBoundary from './components/ErrorBoundary';
import { View, Contact, Product, Transaction, Settings as SettingsType, Invoice } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { SmartToy, Loader2, Mail, Lock, User as UserIcon, Wind, Snowflake } from './components/Icons';
import { cn } from './lib/utils';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(localStorage.getItem('companyLogo'));
  const [settings, setSettings] = useState<SettingsType>({
    companyName: 'Cardoso Ar Condicionado',
    cnpj: '',
    email: 'contato@cardosoar.com.br',
    phone: '(11) 99999-9999',
    address: 'São Paulo, SP',
    website: 'www.cardosoar.com.br'
  });
  const [toast, setToast] = useState<{ message: string; subtext: string; type: 'success' | 'error' } | null>(null);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  
  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('userId', user.id)
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
        return;
      }

      if (data) {
        setSettings({
          companyName: data.companyName || 'Cardoso Ar Condicionado',
          cnpj: data.cnpj || '',
          email: data.email || 'contato@cardosoar.com.br',
          phone: data.phone || '(11) 99999-9999',
          address: data.address || 'São Paulo, SP',
          website: data.website || 'www.cardosoar.com.br'
        });
        if (data.logo) {
          setCompanyLogo(data.logo);
        }
      }
    };

    fetchSettings();

    // Set up real-time subscription for settings
    const channel = supabase
      .channel('settings-changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'settings',
        filter: `userId=eq.${user.id}`
      }, (payload) => {
        const data = payload.new;
        setSettings({
          companyName: data.companyName || 'Cardoso Ar Condicionado',
          cnpj: data.cnpj || '',
          email: data.email || 'contato@cardosoar.com.br',
          phone: data.phone || '(11) 99999-9999',
          address: data.address || 'São Paulo, SP',
          website: data.website || 'www.cardosoar.com.br'
        });
        if (data.logo) {
          setCompanyLogo(data.logo);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const showToast = (message: string, subtext: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, subtext, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    setSelectedContact(null);
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setCurrentView('contact-detail');
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setCurrentView('contact-form');
  };

  const handleAddContact = () => {
    setSelectedContact(null);
    setCurrentView('contact-form');
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setCurrentView('product-form');
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentView('product-form');
  };

  const handleAddTransaction = () => {
    setSelectedTransaction(null);
    setCurrentView('finance-form');
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setCurrentView('finance-form');
  };

  const handleAddInvoice = () => {
    setSelectedInvoice(null);
    setCurrentView('invoice-form');
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setCurrentView('invoice-form');
  };

  const handleLogoChange = async (logo: string | null) => {
    setCompanyLogo(logo);
    if (user) {
      try {
        const { error } = await supabase
          .from('settings')
          .update({ logo: logo })
          .eq('userId', user.id);
        
        if (error) throw error;
        showToast('Logo Atualizada', 'A identidade visual da empresa foi atualizada.');
      } catch (error) {
        console.error(error);
        showToast('Erro ao Salvar', 'Não foi possível atualizar a logo.', 'error');
      }
    } else {
      if (logo) {
        localStorage.setItem('companyLogo', logo);
      } else {
        localStorage.removeItem('companyLogo');
      }
      showToast('Logo Atualizada', 'A identidade visual da empresa foi atualizada.');
    }
  };

  const handleSaveSettings = async (newSettings: typeof settings) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          userId: user.id,
          companyName: newSettings.companyName,
          cnpj: newSettings.cnpj,
          email: newSettings.email,
          phone: newSettings.phone,
          address: newSettings.address,
          website: newSettings.website
        }, { onConflict: 'userId' });

      if (error) throw error;
      showToast('Configurações Salvas', 'As informações da empresa foram atualizadas com sucesso.');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      showToast('Erro ao Salvar', error.message || 'Não foi possível salvar as configurações.', 'error');
    }
  };

  const renderView = () => {
    if (!user) return null;

    switch (currentView) {
      case 'dashboard':
        return <Dashboard user={user} onSelectContact={handleSelectContact} onViewChange={handleViewChange} searchTerm={globalSearchTerm} />;
      case 'pipeline':
        return <Pipeline user={user} onViewChange={setCurrentView} onSelectContact={handleSelectContact} searchTerm={globalSearchTerm} />;
      case 'contacts':
        return <Contacts user={user} onSelectContact={handleSelectContact} onAddContact={handleAddContact} searchTerm={globalSearchTerm} />;
      case 'products':
        return <Products user={user} onAddProduct={handleAddProduct} onEditProduct={handleEditProduct} searchTerm={globalSearchTerm} />;
      case 'finance':
        return <Finance user={user} onAddTransaction={handleAddTransaction} onEditTransaction={handleEditTransaction} searchTerm={globalSearchTerm} />;
      case 'invoices':
        return <Invoices user={user} onAddInvoice={handleAddInvoice} onEditInvoice={handleEditInvoice} searchTerm={globalSearchTerm} />;
      case 'reports':
        return <Reports user={user} />;
      case 'settings':
        return (
          <Settings 
            user={user}
            companyLogo={companyLogo} 
            onLogoChange={handleLogoChange} 
            settings={settings}
            onSave={handleSaveSettings}
          />
        );
      case 'contact-detail':
        return selectedContact ? (
          <ContactDetail 
            user={user}
            contact={selectedContact} 
            onBack={() => setCurrentView('contacts')} 
            onEdit={() => handleEditContact(selectedContact)}
            onViewChange={setCurrentView}
            companyLogo={companyLogo}
            companyName={settings.companyName}
          />
        ) : <Contacts user={user} onSelectContact={handleSelectContact} onAddContact={handleAddContact} />;
      case 'contact-form':
        return (
          <ContactForm 
            user={user}
            contact={selectedContact} 
            onBack={() => setCurrentView('contacts')} 
            onSuccess={() => {
              showToast(
                selectedContact ? 'Dossiê Atualizado' : 'Contato Registrado',
                `Relacionamento ${selectedContact ? 'atualizado' : 'adicionado'} com sucesso.`
              );
              setCurrentView('contacts');
            }}
          />
        );
      case 'product-form':
        return (
          <ProductForm 
            user={user}
            product={selectedProduct} 
            onBack={() => setCurrentView('products')} 
            onSuccess={() => {
              showToast(
                selectedProduct ? 'Produto Atualizado' : 'Produto Cadastrado',
                `Item ${selectedProduct ? 'atualizado' : 'adicionado'} com sucesso.`
              );
              setCurrentView('products');
            }}
          />
        );
      case 'finance-form':
        return (
          <FinanceForm 
            user={user}
            transaction={selectedTransaction} 
            onBack={() => setCurrentView('finance')} 
            onSuccess={() => {
              showToast(
                selectedTransaction ? 'Transação Atualizada' : 'Transação Registrada',
                `A movimentação foi ${selectedTransaction ? 'atualizada' : 'adicionada'} com sucesso.`
              );
              setCurrentView('finance');
            }}
          />
        );
      case 'invoice-form':
        return (
          <InvoiceForm 
            user={user}
            invoice={selectedInvoice} 
            onBack={() => setCurrentView('invoices')} 
            onSuccess={() => {
              showToast(
                selectedInvoice ? 'Nota Fiscal Atualizada' : 'Nota Fiscal Emitida',
                `O documento fiscal foi ${selectedInvoice ? 'atualizado' : 'emitido'} com sucesso.`
              );
              setCurrentView('invoices');
            }}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-[60vh] text-secondary">
            <p className="text-lg font-medium">Esta visualização está em construção.</p>
          </div>
        );
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
            }
          }
        });
        if (error) throw error;
        showToast('Conta Criada', 'Verifique seu e-mail para confirmar o cadastro.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        showToast('Bem-vindo', 'Login realizado com sucesso.');
      }
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || 'Ocorreu um erro ao processar sua solicitação.');
      showToast('Erro de Acesso', 'Verifique suas credenciais.', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-full"></div>
          <p className="text-secondary font-bold text-sm uppercase tracking-widest">Inicializando Sistemas...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-surface to-surface">
        <div className="max-w-md w-full bg-surface-container-lowest p-10 rounded-[48px] shadow-2xl border border-outline-variant/10">
          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-8 overflow-hidden border border-outline-variant/10 relative">
              {companyLogo ? (
                <img 
                  src={companyLogo} 
                  alt="Cardoso Ar Condicionado" 
                  className="w-full h-full object-contain p-2" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="flex flex-col items-center relative">
                  <div className="absolute -top-1 -right-1">
                    <Snowflake className="w-4 h-4 text-primary/30 animate-pulse" />
                  </div>
                  <Wind className="w-12 h-12 text-primary" />
                  <span className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter mt-1">Cardoso AR</span>
                </div>
              )}
            </div>
            <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface mb-2">{settings.companyName}</h1>
            <p className="text-secondary text-sm font-medium">Gestão de Vendas e Manutenção</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {loginError && (
              <p className="text-xs text-error font-medium px-1">{loginError}</p>
            )}

            <button 
              type="submit"
              disabled={loginLoading}
              className="w-full py-4 milled-gradient text-white rounded-2xl font-bold shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegistering ? 'Criar Conta' : 'Entrar no Sistema')}
            </button>
          </form>

          <div className="mt-8 flex flex-col items-center gap-4">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm font-bold text-primary hover:underline"
            >
              {isRegistering ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Registre-se'}
            </button>

            <div className="flex items-center gap-4 w-full">
              <div className="h-[1px] bg-outline-variant/20 flex-1"></div>
              <span className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">ou</span>
              <div className="h-[1px] bg-outline-variant/20 flex-1"></div>
            </div>

            <button 
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: window.location.origin
                  }
                });
                if (error) showToast('Erro', error.message, 'error');
              }}
              className="w-full py-3.5 bg-surface-container-low text-on-surface rounded-2xl font-bold border border-outline-variant/20 hover:bg-surface-container-high transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar com Google
            </button>
          </div>

          <p className="mt-10 text-[10px] text-secondary/40 font-bold uppercase tracking-widest text-center">Segurança de Nível Empresarial Ativada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar 
        currentView={currentView} 
        onViewChange={handleViewChange} 
        onLogout={() => supabase.auth.signOut()} 
        companyLogo={companyLogo}
        companyName={settings.companyName}
      />
      
      <div className="ml-64">
        <TopBar user={user} searchTerm={globalSearchTerm} onSearchChange={setGlobalSearchTerm} />
        
        <main className="pt-24 px-10 pb-12 min-h-screen">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView + (selectedContact?.id || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ErrorBoundary>
                {renderView()}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 right-8 bg-on-background text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 z-[100]"
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              toast.type === 'success' ? "bg-green-400" : "bg-error"
            )}></div>
            <div>
              <p className="text-sm font-bold">{toast.message}</p>
              <p className="text-xs opacity-70">{toast.subtext}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
