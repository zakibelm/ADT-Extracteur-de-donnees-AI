const ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const calls=[];
let profileDome='424';
const mock={auth:{signInWithOtp:async x=>{calls.push(['otp',x]);return{};},resetPasswordForEmail:async(...x)=>{calls.push(['recovery',...x]);return{};},signInWithPassword:async x=>{calls.push(['login',x]);return{data:{user:{id:'own-user'}}};},signOut:async()=>{calls.push(['logout']);}},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{dome:profileDome}})})})})};
const context={exports:{},require:name=>name==='@supabase/supabase-js'?{createClient:()=>mock}:{},window:{location:{origin:'https://adt-extracteur-ai.vercel.app'}},crypto};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/supabaseService.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
(async()=>{
 const {requestMemberActivation,requestMemberRecovery,signInMember}=context.exports;
 await assert.rejects(()=>requestMemberActivation('abc','919','member@example.com'));
 await assert.rejects(()=>requestMemberActivation('424','919','invalid'));
 assert.equal(calls.length,0);
 await requestMemberActivation(' 424 ',' 0919 ',' Member@Example.com ');
 const otp=calls[0][1];assert.equal(otp.email,'member@example.com');assert.equal(otp.options.data.dome,'424');assert.equal(otp.options.data.employee_id,'0919');assert.equal(otp.options.data.adt_app,'extracteur');assert.equal(otp.password,undefined);assert.equal(otp.options.data.adt_role,undefined);assert.equal(otp.options.emailRedirectTo,'https://adt-extracteur-ai.vercel.app/?setup=1');
 await requestMemberRecovery(' Member@Example.com ');assert.equal(calls[1][1],'member@example.com');
 await signInMember('424','Member@Example.com','synthetic-password');assert.equal(calls.at(-1)[1].email,'member@example.com');
 profileDome='999';await assert.rejects(()=>signInMember('424','Member@Example.com','synthetic-password'));assert.equal(calls.at(-1)[0],'logout');
 console.log('Authentification : validation, courriel réel, métadonnées sans privilège, redirection, récupération et contrôle du dôme réussis.');
})().catch(e=>{console.error(e);process.exitCode=1;});
