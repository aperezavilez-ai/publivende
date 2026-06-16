import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { getSessionSecret } from "../config";

const SALT_ROUNDS = 12;
const TOKEN_TTL = "30d";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string, email: string): Promise<string> {
  const secret = new TextEncoder().encode(getSessionSecret());
  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const secret = new TextEncoder().encode(getSessionSecret());
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub;
    const email = payload.email;
    if (!userId || typeof userId !== "string" || typeof email !== "string") return null;
    return { userId, email };
  } catch {
    return null;
  }
}
