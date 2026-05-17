import type { APIRoute } from 'astro';
import {
  createDevAuthCookieValue,
  DEV_AUTH_COOKIE,
  DEV_AUTH_MAX_AGE,
  isValidDevAuthCookie,
  isValidDevPassword,
} from '../../lib/devAuth';

export const prerender = false;

export const GET: APIRoute = ({ cookies }) => {
  return Response.json({
    authenticated: isValidDevAuthCookie(cookies.get(DEV_AUTH_COOKIE)?.value),
  });
};

export const POST: APIRoute = async ({ cookies, request }) => {
  let password: unknown;

  try {
    password = (await request.json()).password;
  } catch {
    password = undefined;
  }

  if (!isValidDevPassword(password)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  cookies.set(DEV_AUTH_COOKIE, createDevAuthCookieValue(), {
    httpOnly: true,
    maxAge: DEV_AUTH_MAX_AGE,
    path: '/',
    sameSite: 'strict',
    secure: import.meta.env.PROD,
  });

  return Response.json({ ok: true });
};

export const DELETE: APIRoute = ({ cookies }) => {
  cookies.delete(DEV_AUTH_COOKIE, { path: '/' });
  return Response.json({ ok: true });
};
