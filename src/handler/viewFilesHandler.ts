import { encode as queryEncode, decode as queryDecode } from 'querystring';
import { Request, Response, Router } from 'express';
import { getFilesIndex } from '../filesIndex';
import { getFileNode } from '../utils';

export const viewFilesHandler = Router();

viewFilesHandler.get('/*', async (req: Request, res: Response) => {
    const indexJSON = await getFilesIndex();
    const fileNode = getFileNode(req.path, indexJSON);
    if (typeof fileNode === 'boolean') {
        return res.sendStatus(404);
    }

    const queryIndex = req.originalUrl.indexOf('?');
    const queryString = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
    const queryObject = queryDecode(queryString.slice(1));

    const paths = req.path.split('/');
    const urlPaths = paths.slice(0);
    paths[0] = 'root';

    res.render('template', {
        config: Object.assign({
            display: 'list',
            sort: 'name',
            order: 'ascending',
        }, queryObject),
        request: req,
        paths,
        fileNode,
        queryString,
        queryObject,
        urlPaths: urlPaths.map((_, i) => `/explorer${urlPaths.slice(0, i + 1).join('/')}`),
        setQuery: (key: string, value: string) => {
            return '?' + queryEncode(
                Object.assign({}, queryObject, {
                    [key]: value,
                })
            );
        },
    });
});
