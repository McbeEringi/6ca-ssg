#!/usr/bin/env -S bun --install=force
import{join}from'node:path';
import vm from'node:vm';

const
src='./src',
config_default={
	title:'Hello world!',
	desc:'description goes here...',
	favicon:'/img/favicon.png',
	ogpimg:'/img/icon.png',
};

// console.log(

await Promise.all(
	new Bun.Glob('**/*.html').scanSync(src)[Symbol.iterator]().map(async x=>(
		x={path:x},
		Object.assign(x,await(async(config='',config_mime,bun='')=>({
			html:new HTMLRewriter()
				.on(
					`
					script#config[type="application/toml"],
					script#config[type="application/yaml"],
					script#config[type="application/json"],
					script#config[type="application/json5"]
					`,
					{
						element:e=>(
							config_mime=e.getAttribute('type').replace(/^application\//,'').toUpperCase(),
							e.remove()
						),
						text:x=>config+=x.text
					}
				)
				.on(`script#bun`,{element:e=>e.remove(),text:x=>bun+=x.text})
				.transform(await Bun.file(join(src,x.path)).text()),
			config_mime,
			config:Object.assign({},config_default,(Bun[config_mime]??self[config_mime]).parse(config)),
			bun:(
				bun=new vm.SourceTextModule(bun),
				await bun.link(_=>_),
				await bun.evaluate(),
				bun.namespace.default
			)
		}))()),
		x.html=`\
<!DOCTYPE html>
<html prefix="og:http://ogp.me/ns#" lang="ja"><head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1">
	<title>${x.config.title}</title>
	<meta name="description" content="${x.config.desc}">
	<link rel="icon" type="image/png" href="${x.config.favicon}">
	<meta property="og:type" content="website">
	<meta property="og:title" content="${x.config.title}">
	<meta property="og:description" content="${x.config.desc}">
	<meta property="og:url" content="https://l.6ca.me/${x.path}">
	<meta property="og:image" content="https://6ca.me/${x.config.ogpimg}">
	<link href="https://6ca.me/src/style.css" rel="stylesheet">
</head><body>${x.html}</body></html>
`,
		x.bun?.(x),
		x
	))
)

// );
