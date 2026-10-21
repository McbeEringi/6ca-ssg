#!/usr/bin/env -S bun --install=force
import{join}from'node:path';
import VM from'node:vm';
import * as MODS from'./modules.mjs';

const
root=import.meta.dir,
src=join(root,'src'),
dst=join(root,'dst'),
mkmod=f=>(x=>x=new VM.SyntheticModule(['default'],_=>x.setExport('default',f())))(),
modules=Object.entries(MODS).reduce((a,[i,x])=>(a[i]=mkmod(_=>x),a),{});

await Bun.$`rm -rf ${dst}/*`.quiet().catch(_=>_);
await Bun.$`cp -R ${src}/. ${dst}`;

await Promise.all(
	[...new Bun.Glob('**/*.html').scanSync(src)].sort().map(async x=>(
		console.log(x),
		x={path:x,cwd:join(dst,x,'../')},
		Object.assign(x,await(async(mod='',css='')=>({
			html:new HTMLRewriter()
				.on(`script[type=build]`,{element:e=>e.remove(),text:x=>mod+=x.text+(x.lastInTextNode?'\n':'')})
				.on(`style[head]`,{element:e=>e.remove(),text:x=>css+=x.text+(x.lastInTextNode?'\n':'')})
				.transform(await Bun.file(join(dst,x.path)).text()).trim()+'\n',
			style:css.slice(0,-1),
			build:await(async()=>(
				mod=new VM.SourceTextModule(mod),
				mod.linkRequests(mod.moduleRequests.map(({specifier:n})=>modules[n]??mkmod(_=>Bun.file(join(x.cwd,n))))),
				process.chdir(x.cwd),
				mod.instantiate(),
				await mod.evaluate(),
				mod.namespace.default
			))().catch(e=>console.warn(x.path,e))
		}))()),
		x=await(async()=>x.build?.(x))().catch(console.log)??x,
		await Bun.write(join(dst,x.path),x.html),
		0
	))
);
