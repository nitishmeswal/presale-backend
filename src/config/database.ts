import { createClient } from '@supabase/supabase-js';
import { config } from './constants';
import logger from '../utils/logger';

// PRODUCTION-GRADE: Admin client with connection pooling
export const supabaseAdmin = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'neuroswarm-backend'
      }
    }
  }
);

// Note: Supabase JS uses connection pooling internally via PostgREST
// For even better performance, consider using a direct PostgreSQL client
// with connection pooling (e.g., pg-pool) for heavy write operations

// Regular client (for user operations)
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);

// Test database connection
export const testDatabaseConnection = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      logger.error(`Database connection failed: ${error.message || JSON.stringify(error)}`);
      return false;
    }
    
    logger.info('✅ Database connection successful');
    return true;
  } catch (error: any) {
    logger.error(`Database connection error: ${error.message || JSON.stringify(error)}`);
    return false;
  }
};
