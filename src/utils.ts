import child_process, { ExecOptions } from 'child_process';

const factory = (method: 'exec' | 'execFile') => (
    cmd: string,
    options: ExecOptions = {}
) =>
    new Promise((resolve, reject) => {
        child_process[method](cmd, options, (err, stdout, stderr) => {
            if (err) return console.error(err);
            if (stderr) console.error(stderr);
            console.log(stdout);
            resolve(stdout);
        });
    });

export const exec = factory('exec');
export const execFile = factory('execFile');
