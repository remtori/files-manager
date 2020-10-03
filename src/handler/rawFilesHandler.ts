import { Request, Response, Router } from 'express';
import got from 'got';
import { linkFromPublicPath } from '../utils';

export const rawFilesHandler = Router();

rawFilesHandler.get('/*', (req: Request, res: Response) => {
    const stream = got.stream(
        linkFromPublicPath(req.path, false),
        { retry: 0 }
    );

    stream.pipe(res);
    stream.on('error', () => {
        res.sendStatus(404);
    });
});