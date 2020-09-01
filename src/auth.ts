import { Request, Response } from 'express';
import crypto from 'crypto';

export const auth = () => (req: Request, res: Response, next: () => void) => {
    const authHeader = req.headers.authorization || '';
    const [type, encodedCredentials] = authHeader.split(' ');

    if (type === 'Basic' && encodedCredentials) {
        const credentials = Buffer.from(encodedCredentials, 'base64').toString(
            'ascii'
        );

        const [username, password] = credentials.split(':');
        if (
            hash(username, password) ===
            `9o1QyvVKnXNG3JjRGoQnDkw9r8MuysSa9zHHn+HiBfhb9SSc6WsZDm2gL3vnxP+Us67lVrZNBGiCyK/TUROZbg==`
        ) {
            return next();
        }
    }

    res.setHeader(
        'WWW-Authenticate',
        'Basic realm="Login to upload files", charset="UTF-8"'
    );
    res.sendStatus(401);
};

function hash(username: string, password: string) {
    const h = crypto.createHmac('sha512', password);
    h.update(username);
    return h.digest().toString('base64');
}
