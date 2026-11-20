/**
 * QA-BRANCH-ONLY Cloudflare Pages build.
 * Never use this script on main: it is deliberately absent from main.
 * Cloudflare Access and Basic Auth must both protect the deployed preview
 * before a tester uses an internal flow.
 *
 * This sets VITE_PRELAUNCH_QA only in the child build process. The Preview
 * environment itself remains false, so other branches cannot inherit a bypass.
 */
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const QA_BRANCH='qa/booking-stripe-sandbox';
export function protectedQaEnvironment(source,routeText,hasMiddleware){
  const env={...source};
  if(source.CF_PAGES!=='1'){
    // Unprivileged CI build, strictly without an internal QA bypass.
    env.VITE_PRELAUNCH_QA='false';
    return {env,qaEnabled:false};
  }
  if(source.CF_PAGES_BRANCH!==QA_BRANCH)
    throw new Error('QA build rejected: only the protected QA branch may enable internal flows.');
  if(source.PAGES_RELEASE_MODE==='live')
    throw new Error('QA build rejected: commercial live mode is forbidden.');
  if(source.VITE_LEGAL_APPROVED==='true')
    throw new Error('QA build rejected: commercial legal approval cannot be impersonated.');
  if(!hasMiddleware)throw new Error('QA build rejected: Basic Auth Pages middleware is missing.');
  let route;
  try{route=JSON.parse(routeText)}catch{throw new Error('QA build rejected: invalid Pages Functions routes.')}
  if(route.version!==1||JSON.stringify(route.include)!==JSON.stringify(['/*'])||
    JSON.stringify(route.exclude)!==JSON.stringify([]))
    throw new Error('QA build rejected: not every route is protected.');
  if(source.VITE_PRELAUNCH_QA==='true')
    throw new Error('QA build rejected: Preview-wide bypass flag must remain false; branch build enables it locally.');
  env.VITE_PRELAUNCH_QA='true';
  env.PAGES_RELEASE_MODE='prelaunch';
  env.VITE_LEGAL_APPROVED='false';
  return {env,qaEnabled:true};
}
function run(command,args,env){
 const result=spawnSync(command,args,{env,stdio:'inherit',shell:false});
 if(result.error)throw result.error;
 if(result.status!==0)throw new Error(command+' '+args.join(' ')+' failed with exit '+result.status);
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const routes=readFileSync('public/_routes.json','utf8');
 const middleware=existsSync('functions/_middleware.js')
  && readFileSync('functions/_middleware.js','utf8').includes('context.env?.QA_ACCESS_PASSWORD');
 const {env,qaEnabled}=protectedQaEnvironment(process.env,routes,middleware);
 console.log(qaEnabled
  ? 'QA protected branch: internal test flows enabled for this build only.'
  : 'Local CI build: QA bypass disabled.');
 run(process.platform==='win32'?'npm.cmd':'npm',['run','build'],env);
 run(process.execPath,['scripts/cloudflare-pages-postbuild.mjs'],env);
}
