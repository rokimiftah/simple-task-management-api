import type { Elysia } from "elysia";

export const SECRET_TOKEN = "secret-token-123";

export function extractUserIdFromToken(token: string): number | null {
  const parts = token.split(":");

  if (parts.length !== 2) {
    return null;
  }

  const [prefix, userIdStr] = parts;

  if (prefix !== SECRET_TOKEN) {
    return null;
  }

  const userId = parseInt(userIdStr, 10);

  if (Number.isNaN(userId)) {
    return null;
  }

  return userId;
}

export function generateToken(userId: number): string {
  return `${SECRET_TOKEN}:${userId}`;
}

export const authMiddleware = (app: Elysia) =>
  app
    .derive(({ headers }) => {
      const authHeader = headers.authorization;

      if (!authHeader) {
        return { isValid: false };
      }

      const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);

      if (!tokenMatch) {
        return { isValid: false };
      }

      const token = tokenMatch[1];
      const userId = extractUserIdFromToken(token);

      if (userId === null) {
        return { isValid: false };
      }

      return {
        isValid: true,
        userId
      };
    })
    .onBeforeHandle(({ isValid, set }) => {
      if (!isValid) {
        set.status = 401;
        return {
          error: "Unauthorized",
          message: "Invalid or missing token"
        };
      }
    });
