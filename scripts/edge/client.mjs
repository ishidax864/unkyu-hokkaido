import {createClient} from 'npm:@supabase/supabase-js@2.93.3';
let client;
export function getAdminSupabaseClient(){
 return client ??= createClient(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
}
