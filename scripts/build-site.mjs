import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');

export async function buildSite({root=projectRoot,output=join(root,'_site')}={}){
  const paths=[];
  for(const entry of await readdir(root,{withFileTypes:true}))if(entry.isFile()&&/\.(js|css|html)$/.test(entry.name))paths.push(entry.name);
  async function assets(directory){
    for(const entry of await readdir(join(root,directory),{withFileTypes:true})){
      const path=join(directory,entry.name);
      if(entry.isDirectory())await assets(path);else if(entry.isFile())paths.push(path);
    }
  }
  await assets('assets');
  try{await assets('design');}catch(error){if(error.code!=='ENOENT')throw error;}
  paths.sort();
  const files=await Promise.all(paths.map(async path=>[path,await readFile(join(root,path))]));
  const hash=createHash('sha256');for(const [path,content]of files)hash.update(path).update('\0').update(content).update('\0');
  const revision=hash.digest('hex').slice(0,16),prefix=`releases/${revision}/`;
  if(!files.some(([path])=>path==='index.html'))throw new Error('Missing index.html.');
  await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
  // A release directory keeps every relative module import and font in the same build.
  for(const [path,content]of files){
    const destination=join(output,prefix,path);await mkdir(dirname(destination),{recursive:true});await writeFile(destination,content);
    if(path.endsWith('.html')){
      const base=relative(dirname(path),join(prefix,dirname(path)))+'/';
      const html=content.toString();if(!/<head\b[^>]*>/i.test(html))throw new Error(`Missing head in ${path}.`);
      const entry=join(output,path);await mkdir(dirname(entry),{recursive:true});await writeFile(entry,html.replace(/<head\b[^>]*>/i,`$&<base href="${base}">`));
    }
  }
  await writeFile(join(output,'.nojekyll'),'');
  return {revision,output,files:files.length};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const build=await buildSite();console.log(`Built ${build.files} files in ${build.output} / ${build.revision}`);
}
