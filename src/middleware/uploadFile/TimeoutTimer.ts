export class TimeoutTimer {
    timeout: number;
    callback: () => any;
    timeoutHandler?: NodeJS.Timeout;

    constructor(timeout: number, cb: () => any) {
        this.timeout = timeout;
        this.callback = cb;
    }

    start() {
        this.timeoutHandler = setTimeout(this.callback, this.timeout);
    }

    stop() {
        clearTimeout(this.timeoutHandler as any);
    }

    reset() {
        this.stop();
        this.start();
    }
}
