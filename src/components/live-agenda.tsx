"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clock } from "@/lib/time";
export function LiveAgenda({
  staff,
  appointments,
  openMin,
  closeMin,
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
}) {
  const router = useRouter();
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);
  const start = Math.floor(openMin / 60) * 60;
  const end = Math.ceil(closeMin / 60) * 60;
  const height = (end - start) * 1.2;
  return (
    <div className="agenda-scroll">
      <div className="agenda" style={{ minWidth: 100 + staff.length * 180 }}>
        <div className="agenda-time">
          <div className="agenda-head">SAAT</div>
          <div style={{ height, position: "relative" }}>
            {Array.from({ length: (end - start) / 60 }, (_, i) => (
              <span style={{ top: i * 72 }} key={i}>
                {clock(start + i * 60)}
              </span>
            ))}
          </div>
        </div>
        {staff.map((s) => (
          <div className="agenda-column" key={s.id}>
            <div className="agenda-head">{s.name}</div>
            <div className="agenda-lane" style={{ height }}>
              {appointments
                .filter((a) => a.staffId === s.id && a.status !== "CANCELLED")
                .map((a) => (
                  <a
                    href={`#appointment-${a.id}`}
                    className={`agenda-event status-${a.status.toLowerCase()}`}
                    key={a.id}
                    style={{
                      top: (a.startMin - start) * 1.2,
                      height: Math.max((a.endMin - a.startMin) * 1.2 - 2, 16),
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
        ))}
      </div>
    </div>
  );
}
