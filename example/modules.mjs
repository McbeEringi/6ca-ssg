const
config_default={
	title:'Hello world!',
	desc:'description goes here...',
	favicon:'/img/favicon.png',
	ogpimg:'/img/icon.png',
	origin:'https://6ca.me/'
},
html_tmpl=c=>x=>((
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
${x.style.length?`\t<style>${x.style.join('\n')}\t</style>\n`:''}\
	<script>document.documentElement.addEventListener('touchstart',_=>_,{passive:true});</script>
</head><body>
${x.html}\
</body></html>
`}))();

export{config_default,html_tmpl};
