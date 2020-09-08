import run from '@rollup/plugin-run';
import typescript from '@rollup/plugin-typescript';
import consts from 'rollup-plugin-consts';
import builtinModules from 'builtin-modules';
import dotenv from 'dotenv';
import path from 'path';

import pkg from './package.json';

const dev = process.env.ROLLUP_WATCH === 'true';

export default {
	input: './src/index.ts',
	output: {
		file: './dist/index.js',
		format: 'cjs'
	},
	plugins: [
		typescript(),
		consts({
			dev: dev,
		}),
		dev && run({
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
