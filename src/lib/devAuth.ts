import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const DEV_AUTH_COOKIE = 'portfolio_dev_auth';
export const DEV_AUTH_MAX_AGE = 60 * 60 * 12;

const PASSWORD_HASH = 'c529e209ff89834161bf0b49174a1bbd2bfd2c4b9c18841d201fa11e35b8b8b9';
const SESSION_VALUE = 'portfolio-dev-mode:v1';

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function sign(value: string) {
  return createHmac('sha256', PASSWORD_HASH).update(value).digest('hex');
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isValidDevPassword(password: unknown) {
  return typeof password === 'string' && constantTimeEqual(sha256(password), PASSWORD_HASH);
}

export function createDevAuthCookieValue() {
  return `${SESSION_VALUE}.${sign(SESSION_VALUE)}`;
}

export function isValidDevAuthCookie(cookieValue: string | undefined) {
  if (!cookieValue) {
    return false;
  }

  const separatorIndex = cookieValue.lastIndexOf('.');

  if (separatorIndex === -1) {
    return false;
  }

  const value = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);

  return value === SESSION_VALUE && constantTimeEqual(signature, sign(value));
}
