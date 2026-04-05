import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export const createNotification = async (userId: string, title: string, description: string, type: 'lead' | 'os' | 'contact' | 'system') => {
  try {
    const payload = {
      title,
      description,
      type,
      read: false
    };
    
    const { error } = await supabase.from('notifications').insert(payload);
    if (error) throw error;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};
