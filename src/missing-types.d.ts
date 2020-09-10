declare module 'consts:dev' {
    const dev: boolean;
    export default dev;
}

declare module 'consts:publish_port' {
    const port: number;
    export default port;
}

declare namespace NodeJS {
    interface Global {
        PORT: number | string;
    }
}
