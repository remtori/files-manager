import run from '@rollup/plugin-run';
import typescript from '@rollup/plugin-typescript';
import consts from 'rollup-plugin-consts';
import { terser } from 'rollup-plugin-terser';
import builtinModules from 'builtin-modules';
import dotenv from 'dotenv';
import path from 'path';

import pkg from './package.json';

const dev = process.env.DEV == 1;
const isWatch = process.env.ROLLUP_WATCH === 'true';

export default {
	input: './src/index.ts',
	output: {
		file: './dist/index.js',
		format: 'cjs'
	},
	plugins: [
		terser(),
		typescript(),
		consts({
			dev: dev,
		}),
		isWatch && run({
			options: {
				env: dotenv.config({
					path: path.join(__dirname, '.env.dev')
				}).parsed
			}
		}),
	],
	external: [
		'../config.json'
	].concat(
		Object.keys(pkg.dependencies),
		builtinModules
	)
}
