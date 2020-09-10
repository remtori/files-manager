import path from 'path';
import { exec, execFile } from './utils';
import { repoPath, config } from './config';

export const commit = (message: string) =>
    execFile(path.join(__dirname, '../src/commit.sh'), {
        cwd: repoPath,
        env: { COMMIT_MSG: message },
    });

export const push = () =>
    exec(
        `git push https://${process.env.GITHUB_TOKEN}@github.com/${config.owner}/${config.repo}.git`,
        { cwd: repoPath }
    );

let timeoutHandler: NodeJS.Timeout;
export function queuePush() {
    clearTimeout(timeoutHandler);
    timeoutHandler = setTimeout(push, config.gitPushTimeout);
}
