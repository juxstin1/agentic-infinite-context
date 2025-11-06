/**
 * Shared ID generation utilities
 * Consolidates ID creation logic used throughout the app
 */

/**
 * Creates a unique ID using timestamp and random string
 * @returns A unique ID string in format: {timestamp}-{random}
 * @example "lg3k5m-9q8w7e6r5t"
 */
export const createId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

/**
 * Creates a UUID-like ID (more entropy than createId)
 * @returns A UUID-like string
 */
export const createUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Creates a short ID (8 characters)
 * @returns A short unique ID
 */
export const createShortId = (): string => {
  return Math.random().toString(36).slice(2, 10);
};
