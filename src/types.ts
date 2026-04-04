export type View = 'dashboard' | 'contacts' | 'pipeline' | 'reports' | 'settings' | 'contact-detail' | 'contact-form' | 'products' | 'product-form' | 'finance' | 'finance-form' | 'invoices' | 'invoice-form';

export interface Metric {
  label: string;
  value: string;
  trend?: string;
  trendType?: 'up' | 'down';
  target?: string;
  industryAvg?: string;
}

export interface Engagement {
  id: string;
  entity: string;
  subtext: string;
  activity: string;
  time: string;
  value: string;
  status: 'Completed' | 'In Review' | 'New' | 'Active Partnership' | 'Strategic Review' | 'Pending Discovery' | 'At Risk';
  initials?: string;
  logo?: string;
}

export interface Task {
  id: string;
  priority: 'Priority' | 'Routine' | 'Discovery';
  time: string;
  title: string;
  description: string;
  assignees?: string[];
}

export interface PipelineCard {
  id: string;
  title: string;
  description: string;
  value: string;
  tag: string;
  tagColor: string;
  owner: string;
  ownerAvatar: string;
  statusIcon: string;
  financialStatus?: 'Adimplente' | 'Inadimplente' | 'Pendente';
  paymentMethod?: 'Pix' | 'Cartão de Crédito' | 'Dinheiro';
}

export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Contact {
  id: string;
  name: string;
  address: string;
  cnpjCpf: string;
  status: 'Contrato Ativo' | 'Manutenção Pendente' | 'Orçamento Enviado' | 'Instalação Pendente' | 'Visita Técnica Agendada' | 'Aguardando Peças' | 'Serviço Concluído' | 'Em Negociação';
  portfolioValue: string;
  growth?: string;
  lastInteraction: string;
  lastInteractionTime: string;
  initials?: string;
  avatar?: string;
  email: string;
  phone: string;
  location: string;
  userId: string;
  createdAt?: string;
  // HVAC Specific Fields
  equipmentType?: string;
  equipmentBrand?: string;
  equipmentModel?: string;
  equipmentQuantity?: string;
  btus?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  installationDate?: string;
  birthDate?: string;
  notes?: string;
  financialStatus?: 'Adimplente' | 'Inadimplente' | 'Pendente';
  paymentMethod?: 'Pix' | 'Cartão de Crédito' | 'Dinheiro';
  relationshipScore?: number;
}

export interface UsedProduct {
  productId: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface ServiceOrder {
  id: string;
  contactId: string;
  contactName: string;
  subject: string;
  description: string;
  materials: string;
  finalizationNotes?: string;
  usedProducts?: UsedProduct[];
  value: string;
  userId?: string;
  createdAt: string;
  status: 'Aberta' | 'Finalizada' | 'Orçamento Aceito' | 'Orçamento Rejeitado';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  stock_quantity: number;
  unit: string; // e.g., 'un', 'kg', 'm'
  sku?: string;
  userId: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: string;
  type: 'Entrada' | 'Saída';
  category: string;
  date: string;
  contactId?: string;
  userId: string;
  createdAt: string;
  isOS?: boolean;
  osStatus?: string;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: string; // Cargo
  privilege: 'Admin' | 'Técnico' | 'Vendedor' | 'Visualizador';
  status: 'Ativo' | 'Inativo';
  userId: string;
  createdAt: string;
}

export interface Settings {
  companyName: string;
  cnpj?: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logo?: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'lead' | 'os' | 'contact' | 'system';
  createdAt: string;
  read: boolean;
  userId: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  code?: string;
}

export interface Invoice {
  id: string;
  number: string;
  series: string;
  type: 'Produto' | 'Serviço';
  contactId: string;
  contactName: string;
  contactCnpjCpf: string;
  issueDate: string;
  items: InvoiceItem[];
  totalAmount: number;
  status: 'Emitida' | 'Cancelada' | 'Rascunho';
  userId: string;
  createdAt: string;
  xmlUrl?: string;
  pdfUrl?: string;
  observations?: string;
}
