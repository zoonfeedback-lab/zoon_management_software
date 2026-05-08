import type { Request, Response } from 'express';

export const REFRESH_COOKIE_NAME = 'refreshToken';

const parseCookies = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rawValueParts] = part.trim().split('=');
    if (!rawKey) {
      return acc;
    }

    acc[decodeURIComponent(rawKey)] = decodeURIComponent(rawValueParts.join('='));
    return acc;
  }, {});
};

export const getCookieValue = (
  request: Request,
  cookieName: string,
): string | undefined => {
  const reqWithCookies = request as Request & {
    cookies?: Record<string, string>;
  };
  if (reqWithCookies.cookies?.[cookieName]) {
    return reqWithCookies.cookies[cookieName];
  }

  return parseCookies(request.headers.cookie)[cookieName];
};

export const setRefreshCookie = (
  response: Response,
  token: string,
  maxAgeMs: number,
) => {
  response.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: maxAgeMs,
    path: '/',
  });
};

export const clearRefreshCookie = (response: Response) => {
  response.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  });
};
