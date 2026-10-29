// Cloudflare Worker. Configure MOD_PASSWORD, GITHUB_TOKEN as Worker secrets.
// Configure REPO_OWNER, REPO_NAME, ALLOWED_ORIGIN as Worker variables.
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN;
    const headers = {
      'Access-Control-Allow-Origin': allowed,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Vary': 'Origin',
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8'
    };
    const reply = (status, value) => new Response(JSON.stringify(value), {status, headers});
    if (!allowed || !env.MOD_PASSWORD || !env.GITHUB_TOKEN || !env.REPO_OWNER || !env.REPO_NAME) return reply(503,{error:'Worker is not configured'});
    if (origin !== allowed) return reply(403,{error:'Origin not allowed'});
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (!['GET','POST'].includes(request.method)) return reply(405,{error:'Method not allowed'});
    // The password is never included in the public GitHub Pages files.
    const provided = request.headers.get('Authorization') || '';
    if (provided !== `Bearer ${env.MOD_PASSWORD}`) return reply(401,{error:'Incorrect moderator password'});
    if (request.method === 'GET') return reply(200,{ok:true});
    if (Number(request.headers.get('Content-Length')||0)>500000) return reply(413,{error:'Data too large'});
    let data;
    try { data = await request.json(); } catch { return reply(400,{error:'Invalid JSON'}); }
    if (!data || !Array.isArray(data.levels) || !Array.isArray(data.completions)) return reply(400,{error:'Invalid data structure'});
    if (JSON.stringify(data).length>500000) return reply(413,{error:'Data too large'});
    const ids = new Set();
    for(const l of data.levels){
      if(!l || typeof l.id!=='string' || !l.id || ids.has(l.id) || typeof l.name!=='string' || !l.name.trim() || !['main','challenge','impossible'].includes(l.category) || !Number.isInteger(l.rank) || l.rank<1) return reply(400,{error:'Invalid level'});
      ids.add(l.id);
    }
    const completionIds=new Set();
    for(const c of data.completions){
      if(!c || typeof c.id!=='string' || !c.id || completionIds.has(c.id) || !ids.has(c.levelId) || typeof c.player!=='string' || !c.player.trim()) return reply(400,{error:'Invalid completion'});
      completionIds.add(c.id);
    }
    const url=`https://api.github.com/repos/${encodeURIComponent(env.REPO_OWNER)}/${encodeURIComponent(env.REPO_NAME)}/contents/data.json`;
    const ghHeaders={Authorization:`Bearer ${env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'jonsercrate-admin'};
    try{
      const current=await fetch(url,{headers:ghHeaders});
      if(!current.ok)return reply(502,{error:'Cannot read GitHub data.json ('+current.status+')'});
      const info=await current.json();
      const raw=new TextEncoder().encode(JSON.stringify(data,null,2)+'\n');
      // Encode UTF-8 safely without depending on btoa's Latin-1 string restriction.
      let binary='';for(let i=0;i<raw.length;i+=8192)binary+=String.fromCharCode(...raw.subarray(i,i+8192));
      const update=await fetch(url,{method:'PUT',headers:{...ghHeaders,'Content-Type':'application/json'},body:JSON.stringify({message:'Update demon list from moderator dashboard',content:btoa(binary),sha:info.sha,branch:env.BRANCH||'main'})});
      if(!update.ok)return reply(502,{error:'GitHub rejected the save ('+update.status+'). Refresh the page and try again.'});
      return reply(200,{ok:true});
    }catch{return reply(502,{error:'Could not reach GitHub'})}
  }
};
