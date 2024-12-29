import { sql } from '@vercel/postgres';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

import {
  Invoice,
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';

import { formatCurrency } from './utils';

// Load environment variables from .env file
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Key');
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Fetch revenue data from the database
export async function fetchRevenue() {
  try {
    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let { data: revenue, error } = await supabase
      .from('revenue')
      .select('*')

    if (error) {
        throw error;
      }
  
    console.log('Data fetch completed');

    return revenue || [];

  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

// export async function fetchLatestInvoices() {
//   try {
//     const data = await sql<LatestInvoiceRaw>`
//       SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
//       FROM invoices
//       JOIN customers ON invoices.customer_id = customers.id
//       ORDER BY invoices.date DESC
//       LIMIT 5`;

//     const latestInvoices = data.rows.map((invoice) => ({
//       ...invoice,
//       amount: formatCurrency(invoice.amount),
//     }));
//     return latestInvoices;
//   } catch (error) {
//     console.error('Database Error:', error);
//     throw new Error('Failed to fetch the latest invoices.');
//   }

// Fetch the latest invoices from the database
export async function fetchLatestInvoices() {

  console.log('Fetching revenue data...');
  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    const { data, error } = await supabase
    .from('invoices')
    .select(
      `
      amount,
      id,
      ...customers!inner(
        name,
        image_url,
        email
      )
      `,
    )
    .order('date', { ascending: false })
    .limit(5)
    
    if (error) {
      console.error('Error fetching invoices:', error);
      throw new Error('Failed to fetch the latest invoices.');
    }

    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    
    return latestInvoices;
    
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices (2).');
  }
}

// export async function fetchCardData() {
//   try {
//     // You can probably combine these into a single SQL query
//     // However, we are intentionally splitting them to demonstrate
//     // how to initialize multiple queries in parallel with JS.
//     const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
//     const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
//     const invoiceStatusPromise = sql`SELECT
//          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
//          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
//          FROM invoices`;

//     const data = await Promise.all([
//       invoiceCountPromise,
//       customerCountPromise,
//       invoiceStatusPromise,
//     ]);

//     const numberOfInvoices = Number(data[0].rows[0].count ?? '0');
//     const numberOfCustomers = Number(data[1].rows[0].count ?? '0');
//     const totalPaidInvoices = formatCurrency(data[2].rows[0].paid ?? '0');
//     const totalPendingInvoices = formatCurrency(data[2].rows[0].pending ?? '0');

//     return {
//       numberOfCustomers,
//       numberOfInvoices,
//       totalPaidInvoices,
//       totalPendingInvoices,
//     };
//   } catch (error) {
//     console.error('Database Error:', error);
//     throw new Error('Failed to fetch card data.');
//   }
// }


const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const baseQuery = supabase
      .from('invoices')
      .select(
        `
        id,
        amount,
        date,
        status,
        ...customers!inner(name, email, image_url)
        `)
      .order('date', { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1)

    if (query != null) {
      baseQuery.or(`name.ilike.%${query}%, email.ilike.%${query}%`, { referencedTable: 'customers' })

    }

    const { data: invoices , error } = await baseQuery

    if (error) {
      console.error('Error fetching invoices:', error);
      throw new Error('Failed to fetch the latest invoices.');
    }

    return invoices;

  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const { data, error, count } = await supabase
      .from('invoices')
      .select(`*, customers!inner(name, email)`, { count: 'exact' })
      .ilike('customers.name', `%${query}%`)

      console.log('Supabase response:', { data, error, count });

    if (error) {
      throw error;
    }

    if (typeof count !== 'number') {
      throw new Error('Invalid count value');
    }

    console.log(`Total count of invoices: ${count}`);

    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);
    console.log(`Total pages: ${totalPages}`);

  return totalPages;

  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id);

    const invoice = Array.isArray(data) ? data.map((invoice) => ({
        ...invoice,
        // Convert amount from cents to dollars
        amount: invoice.amount / 100,
      })) : [];
      
      if (!Array.isArray(data)) {
        console.error('Expected data to be an array, but got:', data);
      }
    return invoice[0];

  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}
export async function fetchCustomers() {
  try {
    const { data , error } = await supabase
      .from('customers')
      .select('id, name')
      .order('name', { ascending: true })

    const customers = data || [];

    return customers;

  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

// export async function fetchFilteredCustomers(query: string) {
//   try {
//     const data = await sql<CustomersTableType>`
// 		SELECT
// 		  customers.id,
// 		  customers.name,
// 		  customers.email,
// 		  customers.image_url,
// 		  COUNT(invoices.id) AS total_invoices,
// 		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
// 		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
// 		FROM customers
// 		LEFT JOIN invoices ON customers.id = invoices.customer_id
// 		WHERE
// 		  customers.name ILIKE ${`%${query}%`} OR
//         customers.email ILIKE ${`%${query}%`}
// 		GROUP BY customers.id, customers.name, customers.email, customers.image_url
// 		ORDER BY customers.name ASC
// 	  `;

//     const customers = data.rows.map((customer) => ({
//       ...customer,
//       total_pending: formatCurrency(customer.total_pending),
//       total_paid: formatCurrency(customer.total_paid),
//     }));

//     return customers;
//   } catch (err) {
//     console.error('Database Error:', err);
//     throw new Error('Failed to fetch customer table.');
//   }
// }
