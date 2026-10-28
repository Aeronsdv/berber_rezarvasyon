"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, dayParts, today } from "@/lib/time";
/** Panel takvimi için hafta şeridi + önceki/sonraki gün gezintisi. */
export function DateNav({
  shopId,
  date,
  counts,
}: {
  shopId: string;
  date: string;
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const href = (d: string) => `/panel?shop=${shopId}&date=${d}`;
  const now = today();
  // Seçili günün haftası (Pazartesi başlangıçlı)
  const offset = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
  const monday = addDays(date, -offset);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return (
    <div className="date-nav">
      <div className="date-nav-controls">
        <Link
          className="icon-button"
          href={href(addDays(date, -1))}
          aria-label="Önceki gün"
          scroll={false}
        >
          <ChevronLeft size={16} />
        </Link>
        {date !== now && (
          <Link className="button small" href={href(now)} scroll={false}>
            Bugün
          </Link>
        )}
        <Link
          className="icon-button"
          href={href(addDays(date, 1))}
          aria-label="Sonraki gün"
          scroll={false}
        >
          <ChevronRight size={16} />
        </Link>
        <input
          type="date"
          aria-label="Takvim tarihi"
          value={date}
          onChange={(e) => {
            if (e.target.value)
              router.push(href(e.target.value), { scroll: false });
          }}
        />
      </div>
      <div className="week-strip">
        {week.map((d) => {
          const p = dayParts(d);
          return (
            <Link
              key={d}
              href={href(d)}
              scroll={false}
              className={`week-day ${d === date ? "active" : ""} ${d === now ? "today" : ""}`}
              aria-current={d === date ? "date" : undefined}
            >
              <small>{p.weekday}</small>
              <strong>{p.day}</strong>
              <i className={counts[d] ? "has" : ""}>
                {counts[d] ? counts[d] : ""}
              </i>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
