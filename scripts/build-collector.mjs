// Bundle the SAME crawler as the Next.js endpoint, with Edge-specific dependencies.
import {build} from 'esbuild';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
await build({entryPoints:[path.join(root,'scripts/edge/entry.mjs')],outfile:path.join(root,'supabase/functions/collect-rail/index.mjs'),bundle:true,format:'esm',platform:'node',target:'es2022',external:['npm:@supabase/supabase-js@2.93.3','node:crypto'],plugins:[{name:'edge-adapters',setup(b){
 b.onResolve({filter:/^(?:@\/lib\/supabase|.*\/logger)$/},args=>({path:path.join(root,args.path.endsWith('logger')?'scripts/edge/logger.mjs':'scripts/edge/client.mjs')}));
}}]});
