import { Request } from 'express';

const ACCEPTABLE_CONTENT_TYPE = /^(multipart\/.+);(.*)$/i;
const UNACCEPTABLE_METHODS = ['GET', 'HEAD'];

const hasBody = (req: Request) =>
	'transfer-encoding' in req.headers || ('content-length' in req.headers && req.headers['content-length'] !== '0');

const hasAcceptableMethod = (req: Request) => !UNACCEPTABLE_METHODS.includes(req.method);

const hasAcceptableContentType = (req: Request) => ACCEPTABLE_CONTENT_TYPE.test(req.headers['content-type'] as string);

export const isEligibleRequest = (req: Request) =>
	hasBody(req) && hasAcceptableMethod(req) && hasAcceptableContentType(req);
