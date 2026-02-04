// Quick Supabase connection test
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_ANON_KEY || ""

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL environment variable is required
  console.log('Please create a .env file with:')
  console.log('SUPABASE_URL is required'
  console.log('SUPABASE_ANON_KEY is required'SUPABASE_ANON_KEY
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('🔗 Testing Supabase connection...')
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log('❌ Connection test failed:', error.message)
      
      // Try to list tables instead
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_table_names')
        
      if (tablesError) {
        console.log('❌ No accessible tables:', tablesError.message)
      } else {
        console.log('✅ Connected! Available tables:', tables)
      }
    } else {
      console.log('✅ Supabase connection successful!')
      console.log('📊 Data:', data)
    }
    
    // Test if onasis-core schema exists
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(10)
      
    if (!schemaError && schemaData) {
      console.log('📋 Available tables in public schema:')
      schemaData.forEach(table => console.log(`  - ${table.table_name}`))
    }
    
  } catch (err) {
    console.error('💥 Connection failed:', err.message)
  }
}

testConnection()