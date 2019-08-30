import resolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import commonjs from 'rollup-plugin-commonjs';
import svelte from 'rollup-plugin-svelte';
import { terser } from 'rollup-plugin-terser';
import alias from 'rollup-plugin-alias';
import config from 'sapper/config/rollup.js';
import pkg from './package.json';
import autoPreprocess from 'svelte-preprocess'

const mode = process.env.NODE_ENV;
const api = process.env.API_URL || `http://buhrmi-macbook.dyndns.org:3001`
const gameServer = process.env.GAME_SERVER_URL || 'ws://benj-xps13.dyndns.org:3000'
const dev = mode === 'development';

const onwarn = (warning, onwarn) => (warning.code === 'CIRCULAR_DEPENDENCY' && /[/\\]@sapper[/\\]/.test(warning.message)) || onwarn(warning);
const dedupe = importee => importee === 'svelte' || importee.startsWith('svelte/');

const replacements = {
	'process.env.NODE_ENV': JSON.stringify(mode),
	'process.env.API_URL': JSON.stringify(api),
	'process.env.GAME_SERVER_URL': JSON.stringify(gameServer)
}

const aliases = {
	'@': __dirname + '/src',
}

export default {
	client: {
		input: config.client.input(),
		output: config.client.output(),
		plugins: [
			replace(replacements),
			alias(aliases),
			svelte({
				dev,
				hydratable: true,
				emitCss: true,
				preprocess: autoPreprocess()
			}),
			resolve({
				browser: true,
				dedupe
			}),
			commonjs(),

			!dev && terser({
				module: true
			})
		],

		onwarn,
	},

	server: {
		input: config.server.input(),
		output: config.server.output(),
		plugins: [
			replace(replacements),
			alias(aliases),
			svelte({
				generate: 'ssr',
				dev,
				preprocess: autoPreprocess()
			}),
			resolve({
				dedupe
			}),
			commonjs()
		],
		external: Object.keys(pkg.dependencies).concat(
			require('module').builtinModules || Object.keys(process.binding('natives'))
		),

		onwarn,
	},

	serviceworker: {
		input: config.serviceworker.input(),
		output: config.serviceworker.output(),
		plugins: [
			resolve(),
			replace(replacements),
			commonjs(),
			!dev && terser()
		],

		onwarn,
	}
};
