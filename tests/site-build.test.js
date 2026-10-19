import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSite } from '../scripts/build-site.mjs';

async function fixture(t){
  const root=await mkdtemp(join(tmpdir(),'far-horizons-build-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(join(root,'assets'));
  await mkdir(join(root,'design','study'),{recursive:true});
  for(const [path,content]of Object.entries({
    'index.html':'<head><link rel="stylesheet" href="style.css"><script type="module" src="app.js"></script></head>',
    'world-map.html':'<head><script type="module" src="app.js"></script></head>',
    'design/study/index.html':'<head><script type="module" src="study.js"></script></head>',
    'design/study/study.js':"import '../../engine.js';",
    'style.css':"@font-face{src:url('./assets/pixel.ttf')}",
    'app.js':"import {value} from './engine.js';",
    'engine.js':"export {value} from './assets/world.js';",
    'assets/world.js':'export const value=1;',
    'assets/pixel.ttf':'font bytes',
  }))await writeFile(join(root,path),content);
  return root;
}

test('published CSS, nested modules, and fonts resolve inside one release under a project URL',async t=>{
  const root=await fixture(t),build=await buildSite({root}),html=await readFile(join(build.output,'index.html'),'utf8'),base='https://example.test/far-horizons/';
  const documentBase=new URL(html.match(/<base href="([^"]+)"/)[1],base),css=new URL('style.css',documentBase),app=new URL(html.match(/src="([^"]+)"/)[1],documentBase),release=new URL(`releases/${build.revision}/`,base);
  assert.equal(css.href,new URL('style.css',release).href);assert.equal(app.href,new URL('app.js',release).href);
  const engine=new URL('./engine.js',app),world=new URL('./assets/world.js',engine),font=new URL('./assets/pixel.ttf',css);
  for(const url of [css,app,engine,world,font]){
    assert.ok(url.href.startsWith(release.href));
    const published=await readFile(join(build.output,url.pathname.slice(new URL(base).pathname.length)));
    const source=await readFile(join(root,url.href.slice(release.href.length)));
    assert.deepEqual(published,source);
  }
  const map=await readFile(join(build.output,'world-map.html'),'utf8');assert.ok(map.includes(`<base href="releases/${build.revision}/">`));
  const study=await readFile(join(build.output,'design/study/index.html'),'utf8'),studyBase=new URL(study.match(/<base href="([^"]+)"/)[1],new URL('design/study/index.html',base));
  assert.equal(new URL('../../engine.js',new URL('study.js',studyBase)).href,new URL('engine.js',release).href);
});

test('unchanged builds reuse URLs, while styles, scripts, and fonts each get a new release',async t=>{
  const root=await fixture(t),first=await buildSite({root}),same=await buildSite({root});assert.equal(first.revision,same.revision);
  await writeFile(join(root,'style.css'),'body{color:gold}');const style=await buildSite({root});assert.notEqual(style.revision,first.revision);
  await writeFile(join(root,'engine.js'),'export const value=2;');const script=await buildSite({root});assert.notEqual(script.revision,style.revision);
  await writeFile(join(root,'assets/pixel.ttf'),'updated font');const font=await buildSite({root});assert.notEqual(font.revision,script.revision);
  const html=await readFile(join(font.output,'index.html'),'utf8');assert.ok(html.includes(`releases/${font.revision}/`));assert.ok(!html.includes(script.revision));
  await assert.rejects(readFile(join(font.output,`releases/${first.revision}/engine.js`)),{code:'ENOENT'});
});
