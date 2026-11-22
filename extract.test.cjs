const ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=ts.transpileModule(fs.readFileSync('api/extract.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
async function run(req,upstreamStatus=200) {
 const calls=[];const ctx={exports:{},AbortSignal,fetch:async(url,options)=>{calls.push(JSON.parse(options.body));return{status:upstreamStatus,json:async()=>({error:'upstream'})};}};
 vm.runInNewContext(code,ctx);
 const res={setHeader(){},status(n){this.code=n;return this;},json(body){this.body=body;return this;}};
 await ctx.exports.default(req,res);return{...res,calls};
}
(async()=>{
 assert.equal((await run({method:'GET',headers:{}})).code,405);
 assert.equal((await run({method:'POST',headers:{}})).code,401);
 const forwarded=await run({method:'POST',headers:{authorization:'Bearer synthetic'},body:{action:'save',image:'synthetic'}},403);
 assert.equal(forwarded.code,403);assert.equal(forwarded.calls[0].action,'extract');assert.equal(forwarded.calls[0].image,'synthetic');
 console.log('Proxy Vercel : méthode, authentification, statut et action extraction vérifiés.');
})().catch(e=>{console.error(e);process.exitCode=1;});
