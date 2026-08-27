import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { account, session, user, verification } from "@/lib/db/schema/auth";
import { creators, preferences, profiles, progressSummaries, userRoles } from "@/lib/db/schema/identity";
import { roles } from "@/lib/db/schema/identity";
import { logger } from "@/lib/logger";

function slugifyHandle(name: string, id: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `${base || "learner"}-${id.slice(0, 6)}`;
}

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.APP_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  user: {
    additionalFields: {
      handle: { type: "string", required: false, input: false },
      status: { type: "string", required: false, defaultValue: "active", input: false },
      locale: { type: "string", required: false, defaultValue: "en" },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (created) => {
          try {
            const handle = slugifyHandle(created.name, created.id);
            await db.update(user).set({ handle }).where(eq(user.id, created.id));
            const [learner] = await db.select().from(roles).where(eq(roles.slug, "learner")).limit(1);
            await db.insert(profiles).values({
              userId: created.id,
              displayName: created.name,
            });
            await db.insert(preferences).values({ userId: created.id });
            await db.insert(progressSummaries).values({ userId: created.id });
            await db.insert(creators).values({
              userId: created.id,
              displayName: created.name,
              slug: handle,
            });
            if (learner) {
              await db.insert(userRoles).values({ userId: created.id, roleId: learner.id });
            }
          } catch (error) {
            logger.error({ err: error, userId: created.id }, "failed to provision user records");
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
  trustedOrigins: [
    process.env.APP_URL ?? "http://localhost:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});

export type Session = typeof auth.$Infer.Session;
