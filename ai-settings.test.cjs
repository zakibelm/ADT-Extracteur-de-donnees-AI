const ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=ts.transpileModule(fs.readFileSync('supabase/functions/adt-ai/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const secret='synthetic-key-never-return';
async function run(body={},options={}) {
 const calls=[];
 const cfg={api_key:options.unconfigured?null:secret,model:'synthetic/vision',skill_tct:'TCT skill from storage',skill_olymel:'Olymel skill',revision:0};
 const ctx={exports:{},Request,Response,Headers,AbortSignal,Date,TextEncoder,Deno:{env:{get:n=>({SUPABASE_URL:'https://db.example',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'}[n])},serve:()=>{}},fetch:async(url,init={})=>{
  calls.push({url,body:init.body?JSON.parse(init.body):undefined});
  let value,status=200;
  if(url.includes('/auth/v1/user')) {if(options.invalid) status=401;value={id:'verified-user',app_metadata:options.admin?{adt_role:'admin'}:{},user_metadata:{adt_role:'admin'}};}
  else if(url.includes('/adt_profiles')) value=options.noProfile?[]:[{id:'verified-user',account_role:options.admin&&!options.profileUser?'admin':'user'}];
  else if(url.endsWith('/adt_ai_config_read')) value=cfg;
  else if(url.endsWith('/adt_ai_config_write')) {value=options.conflict?{message:'revision_conflict'}:1;status=options.conflict?400:200;}
  else if(url.endsWith('/adt_ai_consume')) value=!options.quota;
  else if(url.endsWith('/models')) value={data:[{id:'synthetic/vision',name:'Vision',architecture:{input_modalities:['text','image'],output_modalities:['text']},supported_parameters:['response_format']},{id:'text-only',architecture:{input_modalities:['text'],output_modalities:['text']},supported_parameters:['response_format']}]};
  else if(url.endsWith('/key')) {status=options.badKey?401:200;value={data:{}};}
  else if(url.endsWith('/chat/completions')) value={choices:[{finish_reason:options.truncated?'length':'stop',message:{content:options.invalidResult?'bad json':JSON.stringify({rows:[{tournee:' T1 ',extra:'discard'}]})}}]};
  else throw Error('unexpected fetch');
  return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
 }};
 vm.runInNewContext(code,ctx);
 const headers={'Content-Type':'application/json',...(options.anonymous?{}:{Authorization:'Bearer synthetic'}),...(options.origin?{Origin:options.origin}:{})};
 const response=await ctx.exports.handle(new Request('https://edge.example',{method:'POST',headers,body:JSON.stringify(body)}));
 const result=await response.json();
 assert.equal(JSON.stringify(result).includes(secret),false);
 return {status:response.status,result,calls};
}
(async()=>{
 let r=await run({action:'status'},{anonymous:true});assert.equal(r.status,401);assert.equal(r.calls.length,0);
 r=await run({action:'status'},{invalid:true});assert.equal(r.status,401);assert.equal(r.calls.length,1);
 r=await run({action:'status'});assert.equal(r.status,403);assert.equal(r.calls.some(x=>x.url.includes('/rpc/')),false);
 assert.equal((await run({action:'status'},{admin:true,profileUser:true})).status,403);
 assert.equal((await run({action:'status'},{noProfile:true})).status,403);
 r=await run({action:'status'},{admin:true});assert.equal(r.status,200);assert.equal(r.result.configured,true);assert.equal(r.result.api_key,undefined);
 r=await run({action:'models'},{admin:true});assert.equal(r.result.models.length,1);assert.equal(r.result.models[0].id,'synthetic/vision');
 const save={action:'save',model:'synthetic/vision',skill_tct:'TCT',skill_olymel:'Olymel',revision:0,p_actor:'attacker'};
 r=await run(save,{admin:true});assert.equal(r.status,200);assert.equal(r.calls.find(x=>x.url.endsWith('/adt_ai_config_write')).body.p_actor,'verified-user');
 assert.equal((await run({...save,model:'text-only'},{admin:true})).status,400);
 r=await run({...save,api_key:'synthetic-new-key-valid-length'},{admin:true,badKey:true});assert.equal(r.status,400);assert.equal(r.calls.some(x=>x.url.endsWith('/adt_ai_config_write')),false);
 assert.equal((await run(save,{admin:true,conflict:true})).status,409);
 assert.equal((await run({action:'test'},{admin:true})).status,200);
 const extract={action:'extract',docType:'TCT',image:'data:image/jpeg;base64,YQ==',model:'attacker/model',skill:'ignored'};
 assert.equal((await run(extract,{unconfigured:true})).status,503);
 r=await run(extract,{quota:true});assert.equal(r.status,429);assert.equal(r.calls.some(x=>x.url.includes('/chat/')),false);
 assert.equal((await run(extract,{truncated:true})).status,502);
 assert.equal((await run(extract,{invalidResult:true})).status,502);
 r=await run(extract);assert.equal(r.status,200);assert.equal(r.result.rows[0].tournee,'T1');assert.equal(r.result.rows[0].extra,undefined);
 const chat=r.calls.find(x=>x.url.includes('/chat/')).body;assert.equal(chat.model,'synthetic/vision');assert.ok(chat.messages[0].content.includes('TCT skill from storage'));assert.equal(chat.messages[0].content.includes('ignored'),false);
 assert.equal((await run({action:'status'},{admin:true,origin:'https://untrusted.example'})).status,403);
 console.log('18 contrôles IA réussis : permissions, secret masqué, catalogue, sauvegarde, conflit, quota et extraction avec modèle/skill serveur.');
})().catch(e=>{console.error(e);process.exitCode=1;});
