import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {QA_BRANCH,protectedQaEnvironment} from './qa-protected-pages-build.mjs';

const routes=readFileSync(new URL('../public/_routes.json',import.meta.url),'utf8');
const base={
 CF_PAGES:'1',CF_PAGES_BRANCH:QA_BRANCH,
 PAGES_RELEASE_MODE:'prelaunch',
 VITE_LEGAL_APPROVED:'false',
 VITE_PRELAUNCH_QA:'false'
};

test('only the QA Cloudflare branch enables a child-process test bypass',()=>{
 const r=protectedQaEnvironment(base,routes,true);
 assert.equal(r.qaEnabled,true);
 assert.equal(r.env.VITE_PRELAUNCH_QA,'true');
 assert.equal(r.env.VITE_LEGAL_APPROVED,'false');
 assert.equal(r.env.PAGES_RELEASE_MODE,'prelaunch');
 assert.equal(base.VITE_PRELAUNCH_QA,'false');
});

test('ordinary CI never turns on internal flows',()=>{
 for(const vars of [{},{VITE_PRELAUNCH_QA:'true'},{
  CF_PAGES:'0',CF_PAGES_BRANCH:QA_BRANCH,VITE_PRELAUNCH_QA:'true'
 }]){
  const r=protectedQaEnvironment(vars,routes,true);
  assert.equal(r.qaEnabled,false);
  assert.equal(r.env.VITE_PRELAUNCH_QA,'false');
 }
});

test('forbid publishing a QA bypass to main or to a different Pages preview',()=>{
 for(const name of ['main','feature/misc','qa/my-other-branch','']){
  assert.throws(()=>protectedQaEnvironment({...base,CF_PAGES_BRANCH:name},routes,true),
   /only the protected QA branch/);
 }
});

test('fail closed without covering all paths or without the Basic Auth middleware',()=>{
 for(const invalid of [
  '{"version":1,"include":["/"],"exclude":[]}',
  '{"version":1,"include":["/*"],"exclude":["/assets/*"]}',
  '{not json'
 ]){
  assert.throws(()=>protectedQaEnvironment(base,invalid,true),/QA build rejected/);
 }
 assert.throws(()=>protectedQaEnvironment(base,routes,false),/middleware is missing/);
});

test('commercial and shared Preview configurations may not silently enable QA',()=>{
 assert.throws(()=>protectedQaEnvironment({...base,PAGES_RELEASE_MODE:'live'},routes,true),
  /commercial live mode/);
 assert.throws(()=>protectedQaEnvironment({...base,VITE_LEGAL_APPROVED:'true'},routes,true),
  /commercial legal approval/);
 assert.throws(()=>protectedQaEnvironment({...base,VITE_PRELAUNCH_QA:'true'},routes,true),
  /Preview-wide bypass flag/);
});

test('QA-only build script is not part of main and cannot publish secrets',()=>{
 const src=readFileSync(new URL('./qa-protected-pages-build.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/sk_test_|sk_live_|service_role_key|VITE_QA_ACCESS_PASSWORD/);
 assert.match(src,/VITE_PRELAUNCH_QA='true'/);
 assert.match(src,/CF_PAGES_BRANCH/);
});
