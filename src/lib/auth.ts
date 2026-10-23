import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      console.error('Usuario no encontrado:', error);
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, data.password);

    if (!isValidPassword) {
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
    };
  } catch (error) {
    console.error('Error en authenticateUser:', error);
    return null;
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error en getUserById:', error);
    return null;
  }
}

export async function createUser(email: string, password: string, name: string, role: string = 'user'): Promise<User | null> {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password: hashedPassword,
          name,
          role,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      console.error('Error al crear usuario:', error);
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
    };
  } catch (error) {
    console.error('Error en createUser:', error);
    return null;
  }
}
