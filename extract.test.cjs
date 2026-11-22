const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const code = ts.transpileModule(fs.readFileSync('api/extract.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
async function run(request, responses, env={}) {
  let calls=0;
  const context={exports:{}, require:()=>({TCT_COLUMNS:[{key:'tournee'}],OLYMEL_COLUMNS:[{key:'jour'}]}),process:{env},AbortSignal,
    fetch:async()=>{const next=responses[calls++];if(!next)throw Error('unexpected network call');return {ok:next.ok??true,json:async()=>next.data};}};
  vm.runInNewContext(code,context);
  const result={setHeader(){},status(n){this.code=n;return this;},json(value){this.body=value;return this;}};
  await context.exports.default(request,result);
  return {code:result.code,body:result.body,calls};
}
(async()=>{
  assert.equal((await run({method:'POST',headers:{}},[])).code,401);
  assert.equal((await run({method:'GET',headers:{}},[])).code,405);
  const req={method:'POST',headers:{authorization:'Bearer test'},body:{docType:'TCT',image:'data:image/jpeg;base64,YQ=='}};
  assert.equal((await run(req,[{ok:false}])).code,401);
  assert.equal((await run(req,[{data:{id:'test'}},{data:[]}])).code,403);
  assert.equal((await run(req,[{data:{id:'test'}},{data:[{id:'test'}]}])).code,503);
  const env={OPENROUTER_API_KEY:'synthetic',OPENROUTER_MODEL:'synthetic'};
  assert.equal((await run({...req,body:{...req.body,image:'https://internal.invalid'}},[{data:{id:'test'}},{data:[{}]}],env)).code,400);
  const prefix=[{data:{id:'test'}},{data:[{}]}];
  assert.equal((await run(req,[...prefix,{data:{choices:[{finish_reason:'length',message:{content:'{}'}}]}}],env)).code,502);
  assert.equal((await run(req,[...prefix,{data:{choices:[{message:{content:'{"rows":[null]}'}}]}}],env)).code,502);
  const valid=await run(req,[...prefix,{data:{choices:[{message:{content:'{"rows":[{"tournee":" T1 ","untrusted":"discard"}]}'}}]}}],env);
  assert.equal(valid.code,200);assert.equal(valid.body.rows[0].tournee,'T1'); assert.equal(valid.body.rows[0].untrusted,undefined);
  const constantsContext={exports:{},require:()=>({})};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('constants.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,constantsContext);
  assert.deepEqual(Object.keys(valid.body.rows[0]).sort(),Array.from(constantsContext.exports.TCT_COLUMNS,x=>x.key).sort());
  console.log('9 contrôles API réussis : accès, configuration, entrée, troncature et résultat.');
})().catch(e=>{console.error(e);process.exitCode=1;});
