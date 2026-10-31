/**
 * BizBox Web Admin - Centralized Environment & URL Configuration
 * Reads from NEXT_PUBLIC_* environment variables with dynamic runtime host detection.
 * Zero hardcoded localhost URLs.
 */

export const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    return `${window.location.protocol}//${hostname}:8080/v1`;
  }
  return 'http://localhost:8080/v1';
};

export const getPosBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_POS_URL) {
    return process.env.NEXT_PUBLIC_POS_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    return `${window.location.protocol}//${hostname}:3001`;
  }
  return 'http://localhost:3001';
};

export const getWebBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_WEB_URL) {
    return process.env.NEXT_PUBLIC_WEB_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    return `${window.location.protocol}//${hostname}${window.location.port ? `:${window.location.port}` : ''}`;
  }
  return 'http://localhost:3000';
};

