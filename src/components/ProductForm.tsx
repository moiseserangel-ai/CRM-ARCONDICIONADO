import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, Loader2, Package, Info, DollarSign, Layers, Box } from 'lucide-react';
import { cn } from '../lib/utils';
import { Product, User } from '../types';
import { supabase } from '../lib/supabase';

interface ProductFormProps {
  user: User;
  product: Product | null;
  onBack: () => void;
  onSuccess: () => void;
}

export default function ProductForm({ user, product, onBack, onSuccess }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock_quantity: 0,
    unit: 'un'
  });

  useEffect(() => {
    if (product) {
      const formattedPrice = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(typeof product.price === 'number' ? product.price : parseFloat(String(product.price)) || 0);

      let parsedStock = product.stock_quantity || 0;
      let parsedUnit = product.unit || 'un';
      
      if (product.sku) {
        try {
          const skuData = JSON.parse(product.sku);
          if (skuData.stock !== undefined) parsedStock = skuData.stock;
          if (skuData.stock_quantity !== undefined) parsedStock = skuData.stock_quantity;
          if (skuData.unit !== undefined) parsedUnit = skuData.unit;
        } catch (e) {
          // Ignore if sku is not JSON
        }
      }

      setFormData({
        name: product.name,
        description: product.description,
        price: formattedPrice,
        category: product.category,
        stock_quantity: parsedStock,
        unit: parsedUnit
      });
    }
  }, [product]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    const amount = (parseInt(val) || 0) / 100;
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
    setFormData({ ...formData, price: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const priceValue = parseFloat(formData.price.replace(/[^\d,]/g, '').replace(',', '.'));
      
      const payload = {
        name: formData.name,
        description: formData.description,
        price: priceValue,
        category: formData.category,
        userId: user.id,
        stock_quantity: formData.stock_quantity,
        sku: JSON.stringify({ stock_quantity: formData.stock_quantity, unit: formData.unit })
      };
      
      delete (payload as any).id;
      delete (payload as any).createdAt;

      if (product) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert(payload);
        
        if (error) throw error;
      }
      onSuccess();
    } catch (err: any) {
      console.error('Error saving product:', err);
      alert(`Erro ao salvar produto: ${err.message || 'Tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-surface-container rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-secondary" />
          </button>
          <div>
            <nav className="flex text-[10px] font-bold uppercase tracking-widest text-secondary/60 mb-1 gap-2">
              <span>Produtos</span>
              <span>/</span>
              <span className="text-primary">{product ? 'Editar' : 'Novo'}</span>
            </nav>
            <h2 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">
              {product ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </h2>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 pb-20">
        {/* Basic Info */}
        <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/10">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-headline font-bold text-on-surface">Informações Básicas</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Nome do Produto</label>
              <div className="relative">
                <Box className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                <input 
                  type="text" 
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Compressor 12000 BTU"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Descrição Detalhada</label>
              <div className="relative">
                <Info className="absolute left-4 top-4 w-4 h-4 text-secondary/50" />
                <textarea 
                  rows={4}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva as especificações técnicas, marca, modelo..."
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium resize-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Categoria</label>
              <div className="relative">
                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                <select 
                  required
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium appearance-none"
                >
                  <option value="">Selecione uma categoria</option>
                  <option value="Peças">Peças</option>
                  <option value="Ferramentas">Ferramentas</option>
                  <option value="Equipamentos">Equipamentos</option>
                  <option value="Insumos">Insumos</option>
                  <option value="Serviços">Serviços</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Preço de Venda</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                <input 
                  type="text" 
                  required
                  value={formData.price || ''}
                  onChange={handlePriceChange}
                  placeholder="R$ 0,00"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Estoque Inicial</label>
              <input 
                type="number" 
                required
                min="0"
                value={formData.stock_quantity || ''}
                onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Unidade de Medida</label>
              <select 
                required
                value={formData.unit || ''}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium appearance-none"
              >
                <option value="un">Unidade (un)</option>
                <option value="kg">Quilograma (kg)</option>
                <option value="m">Metro (m)</option>
                <option value="l">Litro (l)</option>
                <option value="cx">Caixa (cx)</option>
                <option value="par">Par (par)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4">
          <button 
            type="button"
            onClick={onBack}
            className="px-8 py-3 bg-surface-container-lowest text-secondary font-headline font-bold text-sm rounded-xl border border-outline-variant/20 hover:bg-surface-container transition-all"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="px-10 py-3 milled-gradient text-white font-headline font-bold text-sm rounded-xl shadow-lg shadow-primary/20 transform active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {product ? 'Salvar Alterações' : 'Cadastrar Produto'}
          </button>
        </div>
      </form>
    </div>
  );
}
