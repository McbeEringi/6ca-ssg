#!/usr/bin/env -S bun --install=force
import{join}from'node:path';
import VM from'node:vm';

const
src='./src',
dst='./dst',
modules=Object.entries({
	config_default:{
		title:'Hello world!',
		desc:'description goes here...',
		favicon:'/img/favicon.png',
		ogpimg:'/img/icon.png',
		origin:'https://6ca.me/'
	},
	html_tmpl:c=>x=>((
		url=new URL(x.path,c.origin).href
	)=>({...x,html:`\
<!DOCTYPE html>
<html prefix="og:http://ogp.me/ns#" lang="ja"><head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1">
	<title>${c.title}</title>
	<meta name="description" content="${c.desc}">
	<link rel="icon" type="image/png" href="${c.favicon}">
	<meta property="og:type" content="website">
	<meta property="og:title" content="${c.title}">
	<meta property="og:description" content="${c.desc}">
	<meta property="og:url" content="${url}">
	<meta property="og:image" content="${new URL(c.ogpimg,url)}">
	<link href="/src/style.css" rel="stylesheet">
${x.style?`\t<style>${x.style}</style>\n`:''}\
</head><body>
${x.html}\
</body></html>
`
	}))()
}).reduce((a,[i,x])=>(
	a[i]=new VM.SyntheticModule(['default'],_=>a[i].setExport('default',x)),
	a
),{});

await Bun.$`rm -rf ${dst}`;
await Bun.$`cp -R ${src}/. ${dst}`;

await Promise.all(
	new Bun.Glob('**/*.html').scanSync(src)[Symbol.iterator]().map(async x=>(
		console.log(x),
		x={path:x},
		Object.assign(x,await(async(mod='',css='')=>({
			html:new HTMLRewriter()
				.on(`script[type=build]`,{element:e=>e.remove(),text:x=>mod+=x.text+(x.lastInTextNode?'\n':'')})
				.on(`style[head]`,{element:e=>e.remove(),text:x=>css+=x.text+(x.lastInTextNode?'\n':'')})
				.transform(await Bun.file(join(dst,x.path)).text()).trim()+'\n',
			style:css.slice(0,-1),
			build:await(async()=>(
				mod=new VM.SourceTextModule(mod),
				mod.linkRequests(mod.moduleRequests.map(x=>modules[x.specifier])),
				mod.instantiate(),
				await mod.evaluate(),
				mod.namespace.default
			))().catch(console.log)
		}))()),
		x=await(async()=>x.build?.(x))().catch(console.log)??x,
		await Bun.write(join(dst,x.path),x.html),
		0
	))
);
