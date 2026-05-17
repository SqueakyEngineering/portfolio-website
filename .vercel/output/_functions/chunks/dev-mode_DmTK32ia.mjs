import { D as DEV_AUTH_COOKIE, i as isValidDevAuthCookie, a as isValidDevPassword, c as createDevAuthCookieValue, b as DEV_AUTH_MAX_AGE } from './devAuth_ChGbPusx.mjs';

const prerender = false;
const GET = ({ cookies }) => {
  return Response.json({
    authenticated: isValidDevAuthCookie(cookies.get(DEV_AUTH_COOKIE)?.value)
  });
};
const POST = async ({ cookies, request }) => {
  let password;
  try {
    password = (await request.json()).password;
  } catch {
    password = void 0;
  }
  if (!isValidDevPassword(password)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  cookies.set(DEV_AUTH_COOKIE, createDevAuthCookieValue(), {
    httpOnly: true,
    maxAge: DEV_AUTH_MAX_AGE,
    path: "/",
    sameSite: "strict",
    secure: true
  });
  return Response.json({ ok: true });
};
const DELETE = ({ cookies }) => {
  cookies.delete(DEV_AUTH_COOKIE, { path: "/" });
  return Response.json({ ok: true });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  DELETE,
  GET,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
