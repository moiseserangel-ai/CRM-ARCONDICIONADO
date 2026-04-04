-- Drop existing tables if they exist to ensure a clean slate
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;

-- Create settings table
CREATE TABLE settings (
  "userId" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "companyName" TEXT DEFAULT 'Cardoso Ar Condicionado',
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  logo TEXT
);

-- Create contacts table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  "cnpjCpf" TEXT,
  status TEXT DEFAULT 'lead', -- lead, opportunity, customer, inactive
  source TEXT,
  notes TEXT,
  location TEXT,
  avatar TEXT,
  initials TEXT,
  "portfolioValue" TEXT,
  growth TEXT,
  "lastInteraction" TEXT,
  "lastInteractionTime" TEXT,
  "equipmentType" TEXT,
  "equipmentBrand" TEXT,
  "equipmentModel" TEXT,
  "equipmentQuantity" TEXT,
  btus TEXT,
  "lastMaintenanceDate" TEXT,
  "nextMaintenanceDate" TEXT,
  "installationDate" TEXT,
  "birthDate" TEXT,
  "financialStatus" TEXT,
  "paymentMethod" TEXT,
  "relationshipScore" INTEGER,
  "lastContactAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  category TEXT,
  sku TEXT,
  stock INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'un',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_users table
CREATE TABLE system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  username TEXT,
  password TEXT,
  role TEXT,
  privilege TEXT DEFAULT 'Técnico',
  status TEXT DEFAULT 'Ativo',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table (Finance)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "contactId" UUID REFERENCES contacts(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- income, expense
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  category TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'completed', -- pending, completed, cancelled
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "contactId" UUID REFERENCES contacts(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  "issueDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "dueDate" DATE,
  amount DECIMAL(12, 2) NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- lead, os, contact, system
  read BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Settings policies
CREATE POLICY "Users can manage their own settings." ON settings
  FOR ALL USING (auth.uid() = "userId");

-- Contacts policies
CREATE POLICY "Users can view their own contacts." ON contacts
  FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can insert their own contacts." ON contacts
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own contacts." ON contacts
  FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own contacts." ON contacts
  FOR DELETE USING (auth.uid() = "userId");

-- Products policies
CREATE POLICY "Users can view their own products." ON products
  FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can insert their own products." ON products
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own products." ON products
  FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own products." ON products
  FOR DELETE USING (auth.uid() = "userId");

-- System users policies
CREATE POLICY "Users can view their own system users." ON system_users
  FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can insert their own system users." ON system_users
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own system users." ON system_users
  FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own system users." ON system_users
  FOR DELETE USING (auth.uid() = "userId");

-- Transactions policies
CREATE POLICY "Users can view their own transactions." ON transactions
  FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can insert their own transactions." ON transactions
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own transactions." ON transactions
  FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own transactions." ON transactions
  FOR DELETE USING (auth.uid() = "userId");

-- Invoices policies
CREATE POLICY "Users can view their own invoices." ON invoices
  FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can insert their own invoices." ON invoices
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own invoices." ON invoices
  FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own invoices." ON invoices
  FOR DELETE USING (auth.uid() = "userId");

-- Notifications policies
CREATE POLICY "Users can view their own notifications." ON notifications
  FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can insert their own notifications." ON notifications
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own notifications." ON notifications
  FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own notifications." ON notifications
  FOR DELETE USING (auth.uid() = "userId");
