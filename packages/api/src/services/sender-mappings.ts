import { ORPCError } from "@orpc/server";
import { db } from "@relune/db";
import { senderMappings, users } from "@relune/db/schema";
import { and, asc, eq } from "drizzle-orm";

export type SenderMapping = {
  id: string;
  externalName: string;
  mappedUser: {
    id: string;
    email: string;
    displayName: string | null;
  };
  createdAt: Date;
};

export async function listSenderMappings(
  userId: string
): Promise<SenderMapping[]> {
  const rows = await db
    .select({
      id: senderMappings.id,
      externalName: senderMappings.externalName,
      createdAt: senderMappings.createdAt,
      mappedUserId: users.id,
      mappedUserEmail: users.email,
      mappedUserDisplayName: users.displayName,
    })
    .from(senderMappings)
    .innerJoin(users, eq(senderMappings.mappedUserId, users.id))
    .where(eq(senderMappings.userId, userId))
    .orderBy(asc(senderMappings.externalName));

  return rows.map((row) => ({
    id: row.id,
    externalName: row.externalName,
    mappedUser: {
      id: row.mappedUserId,
      email: row.mappedUserEmail,
      displayName: row.mappedUserDisplayName,
    },
    createdAt: row.createdAt,
  }));
}

async function getSenderMappingById(input: {
  userId: string;
  id: string;
}): Promise<SenderMapping> {
  const rows = await db
    .select({
      id: senderMappings.id,
      externalName: senderMappings.externalName,
      createdAt: senderMappings.createdAt,
      mappedUserId: users.id,
      mappedUserEmail: users.email,
      mappedUserDisplayName: users.displayName,
    })
    .from(senderMappings)
    .innerJoin(users, eq(senderMappings.mappedUserId, users.id))
    .where(
      and(
        eq(senderMappings.id, input.id),
        eq(senderMappings.userId, input.userId)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new ORPCError("NOT_FOUND", {
      message: "Sender mapping not found",
      data: { code: "SENDER_MAPPING_NOT_FOUND", id: input.id },
    });
  }

  return {
    id: row.id,
    externalName: row.externalName,
    mappedUser: {
      id: row.mappedUserId,
      email: row.mappedUserEmail,
      displayName: row.mappedUserDisplayName,
    },
    createdAt: row.createdAt,
  };
}

export async function upsertSenderMapping(input: {
  userId: string;
  externalName: string;
  mappedUserId: string;
}): Promise<SenderMapping> {
  const externalName = input.externalName.trim();
  if (!externalName) {
    throw new ORPCError("BAD_REQUEST", {
      message: "externalName is required",
      data: { code: "EXTERNAL_NAME_REQUIRED" },
    });
  }

  const result = await db
    .insert(senderMappings)
    .values({
      userId: input.userId,
      externalName,
      mappedUserId: input.mappedUserId,
    })
    .onConflictDoUpdate({
      target: [senderMappings.userId, senderMappings.externalName],
      set: { mappedUserId: input.mappedUserId },
    })
    .returning({ id: senderMappings.id });

  const mappingId = result[0]?.id;
  if (!mappingId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Failed to save sender mapping",
      data: { code: "SENDER_MAPPING_SAVE_FAILED" },
    });
  }

  return await getSenderMappingById({ userId: input.userId, id: mappingId });
}

export async function deleteSenderMapping(input: {
  userId: string;
  id: string;
}): Promise<{ success: true }> {
  const deleted = await db
    .delete(senderMappings)
    .where(
      and(
        eq(senderMappings.id, input.id),
        eq(senderMappings.userId, input.userId)
      )
    )
    .returning({ id: senderMappings.id });

  if (deleted.length === 0) {
    throw new ORPCError("NOT_FOUND", {
      message: "Sender mapping not found",
      data: { code: "SENDER_MAPPING_NOT_FOUND", id: input.id },
    });
  }

  return { success: true };
}
