import { Request, Response } from 'express';

export const onlyHttps = (req: Request, res: Response, next: () => void) => {
    if (
        req.header('x-forwarded-proto') === 'https' ||
        req.hostname.includes('localhost')
    )
        return next();

    res.redirect(`https://${req.header('host')}${req.url}`);
}