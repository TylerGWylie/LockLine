import { prisma } from "./prisma";
import { sendMail } from "./mailer";

export async function notifyWeekTeams(weekId: string, subject: string, body: string): Promise<void> {
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: {
      season: {
        include: {
          teamSeasonEntries: {
            include: {
              team: { include: { memberships: { where: { status: "active" }, include: { user: true } } } },
            },
          },
        },
      },
    },
  });
  if (!week) return;

  for (const entry of week.season.teamSeasonEntries) {
    for (const membership of entry.team.memberships) {
      await sendMail(membership.user.email, subject, body).catch(() => {});
    }
  }
}
