import { prisma } from "./prisma";

export async function logAdminAction(params: {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel?: string;
  details?: string;
}): Promise<void> {
  try {
    await prisma.adminActionLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        targetLabel: params.targetLabel,
        details: params.details,
      },
    });
  } catch {
    // Logging failure should never break the underlying admin action —
    // the action itself already succeeded by the time this is called.
  }
}
