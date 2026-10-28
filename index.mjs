#!/usr/bin/env -S bun --install=force
import{join}from'node:path';
import VM from'node:vm';
import{parseArgs}from'node:util';

const
argopt={
	args:Bun.argv.slice(2),
	strict:true,
	// allowPositionals:true,
	options:{
		'src-dir':{type:'string',short:'s',default:'src'},
		'dst-dir':{type:'string',short:'d',default:'dst'},
		'module-index':{type:'string',short:'m',default:'./modules.mjs'},
		help:{type:'boolean',short:'h'}
	}
},
arg=parseArgs(argopt);

arg.values.help&&(console.log(argopt),process.exit(0));

const
root=process.cwd(),//import.meta.dir,
src=join(root,arg.values['src-dir']),
dst=join(root,arg.values['dst-dir']),
elog=(...x)=>e=>(console.warn(...x),console.warn(e)),
mksynmod=w=>w&&(m=>(
	w={default:w,...w},
	m=new VM.SyntheticModule(
		Object.keys(w),
		_=>Object.entries(w).forEach(([i,x])=>m.setExport(i,x))
	)
))(),
modules=Object.entries(
	await import(join(root,arg.values['module-index']))
).reduce((a,[i,x])=>(a[i]=mksynmod(x),a),{}),
mod_cache={},
mksrcmod=async({src,path})=>(
	src=new VM.SourceTextModule(src,{identifier:path}),
	src.linkRequests(
		await Promise.all(
			src.moduleRequests.map(async({specifier:n,x})=>modules[n]??(
				x=Bun.file(join(path,'../',n)),
				await x.exists()?(mod_cache[x.name]??=(
					x.type.match(/^text\/javascript;?/)?await mksrcmod({src:await x.text(),path:x.name}):mksynmod(x)
				)):null
			)??(
				mksynmod(await import(n).catch(elog('ImportError at',path)))
			))
		)
	),
	src.instantiate(),
	src
);

await Bun.$`rm -rf ${dst}/*`.quiet().catch(e=>console.log(e.stderr.toJSON()));
await Bun.$`cp -R ${src}/. ${dst}`;

await Promise.all(
	[...new Bun.Glob('**/*.html').scanSync(src)].sort().map(async(x,{mod='',css=[]}={})=>(
		x={path:x},
		console.log(x.path),
		Object.assign(x,await(async()=>({
			html:new HTMLRewriter()
				.on(`script[type=build]`,{element:e=>(e.remove(),e.onEndTag(_=>mod+='\n')),text:x=>mod+=x.text})
				.on(`style[head]`,{element:e=>(css.push(''),e.remove()),text:x=>css[css.length-1]+=x.text})
				.transform(await Bun.file(join(dst,x.path)).text()).trim()+'\n',
			style:css
		}))()),
		mod&&(x=await(async()=>(
			mod=await mksrcmod({src:mod,path:join(dst,x.path)}).catch(elog('LinkError at',x.path)),
			await mod.evaluate().catch(elog('EvalError at',x.path)),
			await(async()=>(
				mod.namespace.default?.(x)
			))().catch(elog('ExecError at',x.path))
		))()??x),
		await Bun.write(join(dst,x.path),x.html),
		0
	))
);
