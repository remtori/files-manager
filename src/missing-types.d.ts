declare module 'consts:dev' {
	const dev: boolean;
	export default dev;
}

declare namespace NodeJS {
	interface Global {
		PORT: number | string;
	}
}
