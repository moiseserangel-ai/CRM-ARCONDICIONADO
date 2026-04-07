import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, MoreVertical, Loader2, Trash2, Edit2, LayoutGrid, List, Tag, Layers, BarChart3, ArrowRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Product, User } from '../types';
import { supabase } from '../lib/supabase';

interface ProductsProps {
  user: User;
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  searchTerm?: string;
}

export default function Products({ user, onAddProduct, onEditProduct, searchTerm = '' }: ProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        setError(error.message || 'Falha ao carregar produtos.');
      } else {
        setProducts(data as Product[]);
      }
      setLoading(false);
    };

    fetchProducts();

    // Set up real-time subscription
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `userId=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setProducts((prev) => [payload.new as Product, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setProducts((prev) =>
              prev.map((p) => (p.id === payload.new.id ? (payload.new as Product) : p))
            );
          } else if (payload.eventType === 'DELETE') {
            setProducts((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleDelete = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);

      if (error) throw error;
      
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
    } catch (err) {
      console.error('Error deleting product:', err);
    } finally {
      setDeleting(false);
      setProductToDelete(null);
    }
  };

  const normalize = (str: string) => 
    (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const getProductStock = (p: Product) => {
    if (p.stock_quantity !== undefined) return p.stock_quantity;
    if (p.sku) {
      try {
        const skuData = JSON.parse(p.sku);
        if (skuData.stock !== undefined) return skuData.stock;
      } catch (e) {
        // Ignore
      }
    }
    return 0;
  };

  const getProductUnit = (p: Product) => {
    if (p.unit !== undefined) return p.unit;
    if (p.sku) {
      try {
        const skuData = JSON.parse(p.sku);
        if (skuData.unit !== undefined) return skuData.unit;
      } catch (e) {
        // Ignore
      }
    }
    return 'un';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      normalize(product.name).includes(normalize(localSearchTerm)) ||
      normalize(product.description).includes(normalize(localSearchTerm)) ||
      normalize(product.category).includes(normalize(localSearchTerm));
    
    return matchesSearch;
  });

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Inventory Management</span>
          </div>
          <h2 className="text-4xl font-headline font-black tracking-tight text-on-surface">Catálogo de Produtos</h2>
          <p className="text-secondary font-body text-sm max-w-md">Gerencie suas peças, equipamentos e insumos para ordens de serviço.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-surface-container-low/50 backdrop-blur-sm border border-outline-variant/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="text-right pr-4 border-r border-outline-variant/10">
              <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-0.5">Total de Itens</p>
              <p className="text-xl font-black text-primary">{products.length}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-0.5">Valor em Estoque</p>
              <p className="text-xl font-black text-on-surface">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  products.reduce((acc, p) => {
                    let price = 0;
                    if (typeof p.price === 'number') {
                      price = p.price;
                    } else if (typeof p.price === 'string') {
                      const cleanStr = p.price.replace(/[^\d,-]/g, '').replace(',', '.');
                      price = parseFloat(cleanStr) || 0;
                    }
                    return acc + (price * getProductStock(p));
                  }, 0)
                )}
              </p>
            </div>
          </div>
          
          <button 
            onClick={onAddProduct}
            className="flex items-center gap-2 px-6 py-3.5 milled-gradient text-white font-headline font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface-container-low/50 p-4 rounded-2xl border border-outline-variant/10">
        <div className="flex-1 flex items-center gap-4 w-full">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary">
              <Search className="w-5 h-5" />
            </div>
            <input 
              type="text"
              placeholder="Buscar produto por nome, descrição ou categoria..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className="w-full bg-surface-container-lowest pl-12 pr-4 py-3.5 rounded-2xl text-sm font-semibold text-on-surface-variant border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-surface-container-highest p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-white text-primary shadow-sm" : "text-secondary/60 hover:text-secondary"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'table' ? "bg-white text-primary shadow-sm" : "text-secondary/60 hover:text-secondary"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <div className="h-8 w-px bg-outline-variant/20 mx-1"></div>
          <span className="text-[10px] font-black text-secondary uppercase tracking-widest">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'Item' : 'Itens'}
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-secondary font-black text-[10px] uppercase tracking-widest">Sincronizando Catálogo...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-6 bg-surface-container-lowest rounded-3xl border border-outline-variant/10">
            <div className="w-16 h-16 bg-error-container/10 rounded-full flex items-center justify-center mb-2">
              <Package className="w-8 h-8 text-error" />
            </div>
            <h3 className="text-xl font-black font-headline text-on-surface">Erro ao carregar</h3>
            <p className="text-secondary max-w-md text-sm">{error}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-6 bg-surface-container-lowest rounded-3xl border border-outline-variant/10 border-dashed">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-2xl font-black font-headline text-on-surface">Nenhum Produto Encontrado</h3>
            <p className="text-secondary max-w-md text-sm font-medium leading-relaxed">
              Sua busca não retornou resultados ou seu catálogo está vazio. Comece adicionando novos itens.
            </p>
            <button 
              onClick={onAddProduct}
              className="mt-6 px-8 py-3 bg-primary/10 text-primary font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-primary/20 transition-all"
            >
              Adicionar Primeiro Produto
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={product.id}
                  className="bg-surface-container-lowest p-6 rounded-[32px] shadow-sm border border-outline-variant/5 group hover:shadow-xl hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden flex flex-col"
                  onClick={() => onEditProduct(product)}
                >
                  {/* Category Badge */}
                  <div className="flex justify-between items-start mb-6">
                    <span className="px-3 py-1.5 bg-surface-container-high/50 text-secondary rounded-full text-[9px] font-black uppercase tracking-widest">
                      {product.category}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditProduct(product);
                        }}
                        className="p-2 hover:bg-primary/10 rounded-xl text-primary transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setProductToDelete(product);
                        }}
                        className="p-2 hover:bg-error-container/20 text-error rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Package className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="font-headline text-lg font-black text-on-surface group-hover:text-primary transition-colors leading-tight">
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-secondary mt-1">
                          <Tag className="w-3 h-3" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">{product.category}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-secondary leading-relaxed line-clamp-2 min-h-[32px]">
                      {product.description}
                    </p>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-outline-variant/10">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5">
                          <Layers className="w-3 h-3" /> Estoque
                        </p>
                        <p className="text-base font-black text-on-surface">
                          {getProductStock(product)} <span className="text-[10px] text-secondary uppercase">{getProductUnit(product)}</span>
                        </p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[9px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5 justify-end">
                          <BarChart3 className="w-3 h-3" /> Preço
                        </p>
                        <p className="text-base font-black text-primary">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            typeof product.price === 'number' ? product.price : parseFloat(String(product.price)) || 0
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="mt-6 pt-4 border-t border-outline-variant/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                      <span className="text-[10px] font-bold text-secondary uppercase tracking-tighter">Disponível</span>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center text-secondary group-hover:bg-primary group-hover:text-white transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-[32px] shadow-sm border border-outline-variant/5 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-secondary">Produto</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-secondary">Categoria</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-secondary">Estoque</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-secondary text-right">Preço Unitário</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-secondary text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-surface-bright transition-colors group cursor-pointer" onClick={() => onEditProduct(product)}>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                          <Package className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-headline font-black text-on-surface group-hover:text-primary transition-colors">{product.name}</p>
                          <p className="text-xs text-secondary truncate max-w-[250px]">{product.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 rounded-full bg-surface-container-high text-[9px] font-black text-secondary uppercase tracking-widest">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-on-surface">
                        {getProductStock(product)} <span className="text-[10px] text-secondary uppercase font-bold">{getProductUnit(product)}</span>
                      </p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="font-headline font-black text-primary text-lg">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          typeof product.price === 'number' ? product.price : parseFloat(String(product.price)) || 0
                        )}
                      </p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditProduct(product);
                          }}
                          className="p-2.5 text-secondary hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductToDelete(product);
                          }}
                          className="p-2.5 text-secondary hover:text-error hover:bg-error-container/20 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Metrics */}
      <section className="pt-12 pb-20 border-t border-outline-variant/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/10 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Itens em Estoque</p>
              <h4 className="text-2xl font-headline font-black text-on-surface">
                {products.reduce((acc, p) => acc + getProductStock(p), 0)}
              </h4>
            </div>
          </div>

          <div className="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/10 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
              <Tag className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Categorias Ativas</p>
              <h4 className="text-2xl font-headline font-black text-on-surface">
                {new Set(products.map(p => p.category)).size}
              </h4>
            </div>
          </div>

          <div className="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/10 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Valor Médio</p>
              <h4 className="text-2xl font-headline font-black text-on-surface">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  products.length > 0 
                    ? products.reduce((acc, p) => {
                        const price = typeof p.price === 'number' ? p.price : parseFloat(String(p.price)) || 0;
                        return acc + price;
                      }, 0) / products.length
                    : 0
                )}
              </h4>
            </div>
          </div>
        </div>
      </section>

      {/* Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-[32px] p-8 shadow-2xl border border-outline-variant/10">
            <div className="w-16 h-16 bg-error-container/20 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-error" />
            </div>
            <h3 className="text-2xl font-bold font-headline text-on-surface mb-2">Excluir Produto?</h3>
            <p className="text-secondary mb-8 leading-relaxed">
              Você está prestes a remover permanentemente o produto <span className="font-bold text-on-surface">{productToDelete.name}</span>. Esta ação é irreversível e todos os dados associados serão perdidos.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-3 bg-surface-container-low text-secondary rounded-xl font-bold hover:bg-surface-container-high transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-error text-white rounded-xl font-bold shadow-lg hover:bg-error/90 transition-all flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir Produto'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
