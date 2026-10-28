# 6ca-ssg
A simple SSG (Static Site Generator) for 6ca.me.

## Usage
Refer to the `example/` directory.

1. Set up the `src/` directory.
	1. Create an HTML file (e.g., `src/index.html`).
	1. Add a `<script type="build">` block.
	This will be executed using BunJS, and you can utilize the Bun API.
	```html
	<script type="build">
	import tmpl from 'tmpl';
	export default tmpl({title: 'hello'});
	</script>
	```
	You must export a function as the `default` export.
	This function will be executed with an argument containing the file's contents.
	1. Add `<style head>` blocks.
	You can include multiple such blocks.
	They are automatically collected and passed as part of the argument to the function exported in `<script type="build">`.
	1. Write standard HTML.
	It is recommended to write only the content that goes inside the `<body>` tag.
	```html
	<h1>Hello world!</h1>
	<p>The clear breeze of Ihatov...</p>
	```
1. Create a `module.mjs` file.
	1. Implement the `tmpl` function used in the previous step.
	```js
	export const {tmpl}={
		tmpl:conf=>x=>(
			// x.path: Path to the HTML file being processed
			// x.html: File content excluding <script type="build"> and <style head> blocks
			// x.style: An array containing the contents of the <style head> blocks
			x.html = `
			<!DOCTYPE html>
			<html>
			<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width,initial-scale=1">
			<title>${conf.title}</title>
			<style>${x.style.join('\n')}</style>
			</head>
			<body>${x.html}</body>
			</html>`,
			x // x.html is output to x.path
		)
	};
	```
1. Run `index.mjs`.
1. A `dst/` directory will be generated.

## Integration with `wrangler`
Refer to [`McbeEringi/6ca.me`](https://github.com/mcbeeringi/6ca.me).

1. Add the following to `package.json`:
```json
{
	"dependencies":{
		"6ca-ssg":"git+https://github.com/mcbeeringi/6ca-ssg.git"
	}
}
```
1. Add the following to `wrangler.jsonc`:
```jsonc
{
	"build":{"command":"bun 6ca-ssg","watch_dir":["src"]},
	"assets":{"directory":"./dst"},
}
```
1. Run `bun i -p`.
1. Verify it works by running `wrangler dev`.
