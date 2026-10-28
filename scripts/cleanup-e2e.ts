import "dotenv/config";
import { db } from "../src/lib/db";
async function main() {
  const emails = process.argv.slice(2);
  if (
    !emails.length ||
    emails.some((e) => !/^e2e-\d+-(customer|owner)@example\.com$/.test(e))
  )
    throw new Error("Only explicitly named E2E fixture users may be removed.");
  const users = await db.user.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  const shops = await db.barbershop.findMany({
    where: { ownerId: { in: ids } },
    select: { id: true },
  });
  const shopIds = shops.map((s) => s.id);
  const where = {
    OR: [{ customerId: { in: ids } }, { barbershopId: { in: shopIds } }],
  };
  await db.notification.deleteMany({ where: { appointment: where } });
  await db.review.deleteMany({ where: { appointment: where } });
  await db.appointment.deleteMany({ where });
  await db.staff.deleteMany({ where: { barbershopId: { in: shopIds } } });
  await db.service.deleteMany({ where: { barbershopId: { in: shopIds } } });
  await db.barbershop.deleteMany({ where: { id: { in: shopIds } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
