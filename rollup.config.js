import typescript from '@rollup/plugin-typescript';
import builtinModules from 'builtin-modules';
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
		dev && run(),
	],
	external: Object.keys(pkg.dependencies).concat(builtinModules)
}
