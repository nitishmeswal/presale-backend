import { createClient } from '@supabase/supabase-js';
import { config } from './constants';
import logger from '../utils/logger';

// Admin client (for server-side operations)
export const supabaseAdmin = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

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
      logger.error('Database connection failed:', error);
      return false;
    }
    
    logger.info('✅ Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection error:', error);
    return false;
  }
};
