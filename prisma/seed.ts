import "dotenv/config";
import { db } from "../src/lib/db";
async function main() {
  const owner = await db.user.upsert({
    where: { email: "demo-owner@example.com" },
    update: {},
    create: {
      email: "demo-owner@example.com",
      name: "Demo İşletmeci",
      role: "OWNER",
    },
  });
  const demos = [
    {
      name: "Demo · Moda Berber Atölyesi",
      slug: "demo-moda-berber",
      district: "Kadıköy",
      address: "Moda, Kadıköy / İstanbul · Örnek konum",
      latitude: 40.9832,
      longitude: 29.0257,
      names: ["Demo Usta Ali", "Demo Usta Deniz"],
      prices: [450, 250, 650],
    },
    {
      name: "Demo · Karaköy Tıraş Kulübü",
      slug: "demo-karakoy-tiras",
      district: "Beyoğlu",
      address: "Karaköy, Beyoğlu / İstanbul · Örnek konum",
      latitude: 41.025,
      longitude: 28.9769,
      names: ["Demo Usta Can", "Demo Usta Efe"],
      prices: [550, 300, 800],
    },
    {
      name: "Demo · Beşiktaş Usta İşi",
      slug: "demo-besiktas-usta",
      district: "Beşiktaş",
      address: "Beşiktaş / İstanbul · Örnek konum",
      latitude: 41.043,
      longitude: 29.007,
      names: ["Demo Usta Mert"],
      prices: [400, 200, 550],
    },
  ];
  for (const d of demos) {
    await db.barbershop.upsert({
      where: { slug: d.slug },
      update: {},
      create: {
        name: d.name,
        slug: d.slug,
        ownerId: owner.id,
        city: "İstanbul",
        district: d.district,
        address: d.address,
        latitude: d.latitude,
        longitude: d.longitude,
        phone: "+90 555 000 00 00",
        description:
          "Bu işletme yalnızca uygulamayı denemek için hazırlanmış örnek veridir; gerçek bir işletme veya gerçek rezervasyon hizmeti değildir. Saç, sakal ve bakım hizmetleriyle demo randevu akışını keşfedebilirsiniz.",
        hours: {
          create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
            dayOfWeek,
            openMin: 540,
            closeMin: 1200,
            isClosed: false,
          })),
        },
        staff: {
          create: d.names.map((name) => ({ name, title: "Demo Berber" })),
        },
        services: {
          create: [
            { name: "Saç kesimi", durationMinutes: 30, price: d.prices[0] },
            { name: "Sakal tıraşı", durationMinutes: 15, price: d.prices[1] },
            { name: "Saç + sakal", durationMinutes: 45, price: d.prices[2] },
          ],
        },
        subscription: {
          create: { trialEndsAt: new Date(Date.now() + 14 * 86400000) },
        },
      },
    });
  }
  console.log(
    "3 açıkça etiketlenmiş demo işletme hazır. Demo işletmeci: demo-owner@example.com",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
