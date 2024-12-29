'use server';

import { annotateDynamicAccess } from 'next/dist/server/app-render/dynamic-rendering';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
 
// Load environment variables from .env file
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Key');
}
const supabase = createClient(supabaseUrl, supabaseKey);

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
  });

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
    const {customerId, amount, status } = CreateInvoice.parse({ 
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];


    console.log('Creating invoice with:', { customerId, amount, status });

    const { error } = await supabase
    .from('invoices')
    .insert({ customer_id: customerId, amount: amountInCents, status, date });

  if (error) {
    console.error('Error inserting invoice:', error);
    throw new Error('Failed to create invoice');
  }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');

}

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  const amountInCents = amount * 100;

  const { error } = await supabase
  .from('invoices')
  .update({ customer_id: customerId, amount: amountInCents, status})
  .eq('id', id);

if (error) {
  console.error('Error updating invoice:', error);
  throw new Error('Failed to update invoice');
}

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase
  .from('invoices')
  .delete()
  .eq('id', id);

  if (error) {
    console.error('Error updating invoice:', error);
    throw new Error('Failed to update invoice');
  }

  revalidatePath('/dashboard/invoices');
}
