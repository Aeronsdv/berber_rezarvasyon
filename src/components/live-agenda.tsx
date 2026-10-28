"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clock } from "@/lib/time";
const PX = 1.2;
function istanbulNowMin() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return get("hour") * 60 + get("minute");
}
export function LiveAgenda({
  staff,
  appointments,
  openMin,
  closeMin,
  isToday = false,
}: {
  staff: { id: string; name: string }[];
  appointments: {
    id: string;
    staffId: string;
    startMin: number;
    endMin: number;
    serviceName: string;
    customer: string;
    status: string;
  }[];
  openMin: number;
  closeMin: number;
  isToday?: boolean;
}) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);
  useEffect(() => {
    if (!isToday) return;
    const tick = () => setNow(istanbulNowMin());
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, [isToday]);
  const start = Math.floor(openMin / 60) * 60;
  const end = Math.ceil(closeMin / 60) * 60;
  const height = (end - start) * PX;
  // Bugünse "şimdi" çizgisini görünür alana getir.
  const positioned = useRef(false);
  useEffect(() => {
    const el = scroller.current;
    if (positioned.current || now === null || !el) return;
    if (now < start || now > end) return;
    positioned.current = true;
    if (el.scrollHeight > el.clientHeight)
      el.scrollTop = Math.max(0, (now - start) * PX - 80);
  }, [now, start, end]);
  const showNow = now !== null && now >= start && now <= end;
  return (
    <div className="agenda-scroll" ref={scroller}>
      <div className="agenda" style={{ minWidth: 64 + staff.length * 160 }}>
        <div className="agenda-time">
          <div className="agenda-head" aria-hidden="true" />
          <div style={{ height, position: "relative" }}>
            {Array.from({ length: (end - start) / 60 }, (_, i) => (
              <span style={{ top: i * 60 * PX }} key={i}>
                {clock(start + i * 60)}
              </span>
            ))}
          </div>
        </div>
        {staff.map((s) => {
          const list = appointments.filter(
            (a) => a.staffId === s.id && a.status !== "CANCELLED",
          );
          return (
            <div className="agenda-column" key={s.id}>
              <div className="agenda-head">
                <span className="mini-avatar">{s.name.slice(0, 1)}</span>
                <span className="agenda-name">{s.name}</span>
                <small>{list.length}</small>
              </div>
              <div
                className="agenda-lane"
                style={{ height, backgroundSize: `100% ${60 * PX}px` }}
              >
                {list.map((a) => (
                  <a
                    href={`#appointment-${a.id}`}
                    className={`agenda-event status-${a.status.toLowerCase()} ${now !== null && now >= a.startMin && now < a.endMin ? "now" : ""}`}
                    key={a.id}
                    style={{
                      top: (a.startMin - start) * PX,
                      height: Math.max((a.endMin - a.startMin) * PX - 3, 18),
                    }}
                    title={`${clock(a.startMin)} ${a.customer} · ${a.serviceName}`}
                  >
                    <strong>
                      {clock(a.startMin)} · {a.customer}
                    </strong>
                    <small>{a.serviceName}</small>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
        {showNow && (
          <div
            className="now-line"
            style={{ top: 36 + (now - start) * PX }}
            aria-label={`Şu an ${clock(now)}`}
          >
            <span>{clock(now)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
