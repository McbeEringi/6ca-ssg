#!/usr/bin/env -S bun --install=force
import{join}from'node:path';
import VM from'node:vm';
import * as MODS from'./modules.mjs';

const
root=import.meta.dir,
src=join(root,'src'),
dst=join(root,'dst'),
elog=(...x)=>e=>(console.warn(...x),console.warn(e)),
mksynmod=f=>(x=>x=new VM.SyntheticModule(['default'],_=>x.setExport('default',f())))(),
modules=Object.entries(MODS).reduce((a,[i,x])=>(a[i]=mksynmod(_=>x),a),{}),
mod_cache={},
mksrcmod=async({src,path})=>(
	src=new VM.SourceTextModule(src,{identifier:path}),
	src.linkRequests(
		await Promise.all(
			src.moduleRequests.map(async({specifier:n,x})=>modules[n]??(
				x=Bun.file(join(path,'../',n)),
				await x.exists()?(mod_cache[x.name]??=(
					x.type.match(/^text\/javascript;?/)?await mksrcmod({src:await x.text(),path:x.name}):mksynmod(_=>x)
				)):null
			)??(
				x=await import(n).catch(elog('ImportError at',path)),
				mksynmod(_=>x)
			))
		)
	),
	src.instantiate(),
	src
);

await Bun.$`rm -rf ${dst}/*`.quiet().catch(e=>console.log(e.stderr.toJSON()));
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
				mod=await mksrcmod({src:mod,path:join(dst,x.path)}),
				await mod.evaluate(),
				mod.namespace.default
			))().catch(elog('EvalError at',x.path))
		}))()),
		x=await(async()=>x.build?.(x))().catch(elog('ExecError at',x.path))??x,
		await Bun.write(join(dst,x.path),x.html),
		0
	))
);
