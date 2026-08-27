import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contentItemSources,
  contentItems,
  contentItemTopics,
  featureFlags,
  learningPaths,
  learningScenes,
  pathItems,
  pathSections,
  permissions,
  promptTemplates,
  recoControls,
  reportCategories,
  rolePermissions,
  roles,
  sources,
  topics,
  user,
  userRoles,
  quizzes,
  quizQuestions,
  generatedArtifacts,
  policyConfigs,
  notificationTemplates,
  announcements,
  account,
} from "@/lib/db/schema";
import { ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { SEED_ITEMS, SEED_TOPICS } from "@/lib/seed/catalog";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { hashPassword } from "better-auth/crypto";

async function upsertRole(slug: string, name: string, description: string) {
  const [existing] = await db.select().from(roles).where(eq(roles.slug, slug)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(roles).values({ slug, name, description }).returning();
  return created;
}

async function upsertPermission(slug: string) {
  const [existing] = await db.select().from(permissions).where(eq(permissions.slug, slug)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(permissions).values({ slug }).returning();
  return created;
}

async function main() {
  const permissionRows = new Map<string, { id: string }>();
  for (const slugs of Object.values(ROLE_PERMISSIONS)) {
    for (const slug of slugs) {
      if (!permissionRows.has(slug)) {
        permissionRows.set(slug, await upsertPermission(slug));
      }
    }
  }

  const roleRows = {
    learner: await upsertRole("learner", "Learner", "Default member"),
    creator: await upsertRole("creator", "Creator", "Can submit for publication"),
    moderator: await upsertRole("moderator", "Moderator", "Reviews the queue"),
    admin: await upsertRole("admin", "Admin", "Operates the service"),
    superadmin: await upsertRole("superadmin", "Superadmin", "Destructive actions"),
  };

  for (const [slug, permSlugs] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roleRows[slug as keyof typeof roleRows];
    for (const permSlug of permSlugs) {
      const perm = permissionRows.get(permSlug);
      if (!role || !perm) continue;
      await db
        .insert(rolePermissions)
        .values({ roleId: role.id, permissionId: perm.id })
        .onConflictDoNothing();
    }
  }

  const topicIds = new Map<string, string>();
  let order = 0;
  for (const topic of SEED_TOPICS) {
    const [existing] = await db.select().from(topics).where(eq(topics.slug, topic.slug)).limit(1);
    if (existing) {
      topicIds.set(topic.slug, existing.id);
      continue;
    }
    const [created] = await db
      .insert(topics)
      .values({ ...topic, sortOrder: order })
      .returning();
    topicIds.set(topic.slug, created.id);
    order += 1;
  }

  for (const slug of ["harassment", "hate", "spam", "copyright", "malware", "misinformation", "privacy"]) {
    await db
      .insert(reportCategories)
      .values({ slug, name: slug.replaceAll("_", " ") })
      .onConflictDoNothing();
  }

  await db
    .insert(promptTemplates)
    .values({
      slug: "generate-item",
      name: "Generate learning item",
      purpose: "generation",
      body: "Produce an original Oriel microlearning item as JSON. Never copy commercial summary products. Cite public sources. Strip secrets.",
    })
    .onConflictDoNothing();

  await db
    .insert(featureFlags)
    .values([
      { slug: "comments_v1", description: "Public comments (off until moderation is complete)", enabled: false },
      { slug: "ai_generation", description: "Queue AI generation when a provider is configured", enabled: true },
    ])
    .onConflictDoNothing();

  await db
    .insert(recoControls)
    .values({
      slug: "default",
      explorationPercent: 15,
      diversityLimits: { topicWindow: 2, formatWindow: 3 },
      freshnessDecay: 0.02,
      qualityThreshold: 0.3,
    })
    .onConflictDoNothing();

  for (const item of SEED_ITEMS) {
    const [existing] = await db.select().from(contentItems).where(eq(contentItems.slug, item.slug)).limit(1);
    const topicId = topicIds.get(item.topic);
    let contentId = existing?.id;
    if (!existing) {
      const [created] = await db
        .insert(contentItems)
        .values({
          slug: item.slug,
          title: item.title,
          learningObjective: item.learningObjective,
          bodyText: item.bodyText,
          durationSeconds: item.durationSeconds,
          format: item.format,
          difficulty: item.difficulty,
          origin: "editorial",
          publicationState: "published",
          moderationState: "auto_approved",
          generationState: "prepared",
          visibility: "public",
          safetyClass: item.safetyClass ?? "general",
          primaryTopicId: topicId,
          publishedAt: new Date(),
          sourceQuality: 0.82,
          isReusableFact: true,
        })
        .returning();
      contentId = created.id;
      await db.insert(learningScenes).values({
        contentItemId: created.id,
        kind: "schema",
        position: 0,
        schema: { type: "prose", body: item.bodyText },
        fallbackText: item.bodyText,
      });
      for (const source of item.sources) {
        const [src] = await db
          .insert(sources)
          .values({
            title: source.title,
            canonicalUrl: source.url,
            sourceType: "url",
            license: "cited-public-education",
            qualityScore: 0.8,
          })
          .returning();
        await db.insert(contentItemSources).values({
          contentItemId: created.id,
          sourceId: src.id,
          citation: source.citation,
        });
      }
    }
    if (contentId && topicId) {
      await db
        .insert(contentItemTopics)
        .values({ contentItemId: contentId, topicId, isPrimary: true })
        .onConflictDoNothing();
    }
  }

  const [pathExisting] = await db.select().from(learningPaths).where(eq(learningPaths.slug, "seeing-clearly")).limit(1);
  if (!pathExisting) {
    const [path] = await db
      .insert(learningPaths)
      .values({
        slug: "seeing-clearly",
        title: "Seeing clearly",
        description: "A short path: evidence, methods, and not fooling yourself.",
        objectives: ["Notice base rates", "Separate correlation from intervention"],
        estimatedMinutes: 12,
        visibility: "public",
      })
      .returning();
    const [section] = await db
      .insert(pathSections)
      .values({ pathId: path.id, title: "Start here", position: 0 })
      .returning();
    const correlation = await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.slug, "correlation-is-not-a-lever"))
      .limit(1);
    const bayes = await db.select().from(contentItems).where(eq(contentItems.slug, "bayes-clinic-door")).limit(1);
    if (correlation[0]) {
      await db.insert(pathItems).values({ sectionId: section.id, contentItemId: correlation[0].id, position: 0 });
    }
    if (bayes[0]) {
      await db.insert(pathItems).values({ sectionId: section.id, contentItemId: bayes[0].id, position: 1 });
    }
  }

  const [bayesItem] = await db.select().from(contentItems).where(eq(contentItems.slug, "bayes-clinic-door")).limit(1);
  if (bayesItem) {
    const [quizExisting] = await db.select().from(quizzes).where(eq(quizzes.contentItemId, bayesItem.id)).limit(1);
    if (!quizExisting) {
      const [quiz] = await db
        .insert(quizzes)
        .values({ contentItemId: bayesItem.id, title: "Base rates at the clinic door" })
        .returning();
      if (quiz) {
        await db.insert(quizQuestions).values({
          quizId: quiz.id,
          prompt: "A test is 90% sensitive for a rare condition (1 in 100). A positive result most nearly means:",
          choices: [
            "The person almost certainly has the condition",
            "Most positives can still be false when the base rate is low",
            "The test is useless",
            "Prevalence no longer matters",
          ],
          correctIndex: 1,
          explanation: "False positives pile up when the condition is rare, even with a 'good' test.",
          position: 0,
        });
      }
    }
  }

  try {
    const { ensureBucket, putObject } = await import("@/lib/storage");
    const { renderSceneHtml } = await import("@/lib/sandbox/schema-html");
    const { sha256 } = await import("@/lib/hash");
    await ensureBucket();
    const [demo] = await db.select().from(contentItems).where(eq(contentItems.slug, "stack-vs-queue")).limit(1);
    if (demo) {
      const [existingArtifact] = await db
        .select()
        .from(generatedArtifacts)
        .where(eq(generatedArtifacts.contentItemId, demo.id))
        .limit(1);
      if (!existingArtifact) {
        const html = renderSceneHtml(
          {
            type: "comparison",
            left: "A stack is last-in, first-out: plates.",
            right: "A queue is first-in, first-out: a line at a window.",
          },
          "Stack versus queue",
        );
        const key = `artifacts/seed-${demo.id}.html`;
        await putObject({ key, body: html, contentType: "text/html; charset=utf-8" });
        await db.insert(generatedArtifacts).values({
          contentItemId: demo.id,
          originalCode: html,
          compiledObjectKey: key,
          compiledHash: sha256(html),
          compileState: "compiled",
          validation: { seed: true },
          modelId: "editorial",
          source: "seed",
        });
      }
    }
  } catch (error) {
    logger.warn({ err: error }, "seed artifact storage skipped");
  }

  await db
    .insert(policyConfigs)
    .values({
      slug: "community-v1",
      version: "1",
      body: { comments: false, sensitiveSourcesRequired: true },
    })
    .onConflictDoNothing();

  await db
    .insert(notificationTemplates)
    .values([
      {
        slug: "daily-suggestion",
        channel: "in_app",
        title: "A prepared item is waiting",
        body: "Open Oriel when you have a minute. Nothing is lost if you wait.",
      },
      {
        slug: "moderation-update",
        channel: "in_app",
        title: "A moderation update",
        body: "A human reviewed your submission. Open notifications for the outcome.",
      },
    ])
    .onConflictDoNothing();

  const [existingAnnouncement] = await db.select().from(announcements).limit(1);
  if (!existingAnnouncement) {
    await db.insert(announcements).values({
      title: "Comments stay off",
      body: "Public comments remain disabled until the moderation pipeline is complete for that surface.",
    });
  }

  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (adminEmail && adminPassword) {
    const [existingAdmin] = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
    let adminId = existingAdmin?.id;
    if (!existingAdmin) {
      const result = await auth.api.signUpEmail({
        body: { email: adminEmail, password: adminPassword, name: "Oriel Admin" },
      });
      adminId = result.user.id;
      logger.info({ email: adminEmail }, "bootstrap admin created");
    }
    if (adminId) {
      await db
        .update(user)
        .set({ handle: process.env.ADMIN_BOOTSTRAP_HANDLE ?? "oriel-admin" })
        .where(eq(user.id, adminId));
      await db.insert(userRoles).values({ userId: adminId, roleId: roleRows.admin.id }).onConflictDoNothing();
      await db
        .insert(userRoles)
        .values({ userId: adminId, roleId: roleRows.superadmin.id })
        .onConflictDoNothing();
      const [acct] = await db.select().from(account).where(eq(account.userId, adminId)).limit(1);
      if (!acct?.password) {
        const passwordHash = await hashPassword(adminPassword);
        if (!acct) {
          await db.insert(account).values({
            id: crypto.randomUUID(),
            accountId: adminId,
            providerId: "credential",
            issuer: "local:credential",
            userId: adminId,
            password: passwordHash,
          });
        } else {
          await db
            .update(account)
            .set({ password: passwordHash, issuer: "local:credential", providerId: "credential" })
            .where(eq(account.id, acct.id));
        }
        logger.info({ email: adminEmail }, "bootstrap admin password restored");
      }
    }
  }

  logger.info("seed complete");
  process.exit(0);
}

main().catch((error) => {
  logger.error({ err: error }, "seed failed");
  process.exit(1);
});
