import { NextResponse } from "next/server";
import { getClient } from "@/lib/supabase";
import type { ScheduleType } from "@/lib/types";

export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// 유형별 오전/오후 사무실 여부 (사무실이 아니면 비활성)
const TYPE_OFFICE: Record<ScheduleType, { am: boolean; pm: boolean }> = {
  WORK: { am: true, pm: true },
  LEAVE: { am: false, pm: false },
  ANNUAL: { am: false, pm: false },
  HALF: { am: false, pm: false },
  HALF_AM: { am: false, pm: true }, // 오전 반차 → 오후만 사무실
  HALF_PM: { am: true, pm: false }, // 오후 반차 → 오전만 사무실
  TRIP: { am: false, pm: false },
  FIELD: { am: false, pm: false },
  REMOTE: { am: false, pm: false },
  OTHER: { am: false, pm: false },
};
const PRIORITY: ScheduleType[] = [
  "LEAVE",
  "ANNUAL",
  "HALF",
  "HALF_AM",
  "HALF_PM",
  "TRIP",
  "FIELD",
  "REMOTE",
  "WORK",
  "OTHER",
];
const TYPE_LABEL: Record<string, string> = {
  LEAVE: "휴가",
  ANNUAL: "연차",
  HALF: "반차",
  HALF_AM: "오전반차",
  HALF_PM: "오후반차",
  TRIP: "출장",
  FIELD: "외근",
  REMOTE: "재택",
  WORK: "근무",
  OTHER: "기타",
};

function coversDay(startISO: string, endISO: string, allDay: boolean): boolean {
  const sd = new Date(startISO);
  const ed = allDay ? new Date(endISO) : new Date(startISO);
  const now = new Date();
  const s0 = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate());
  const e0 = new Date(ed.getFullYear(), ed.getMonth(), ed.getDate());
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return s0.getTime() <= t0.getTime() && e0.getTime() >= t0.getTime();
}

export async function GET() {
  const webhook = process.env.WEBHOOK_URL ?? "";
  if (!webhook) {
    return NextResponse.json({ ok: false, error: "WEBHOOK_URL 미설정" }, { status: 400 });
  }

  try {
    const client = getClient();
    const dateStr = todayStr();

    const [{ data: employees }, { data: schedules }, { data: reports }] =
      await Promise.all([
        client.from("employees").select("*").eq("is_active", true),
        client.from("schedules").select("*"),
        client.from("reports").select("*").eq("report_date", dateStr),
      ]);

    const empName = (id: string) =>
      (employees ?? []).find((e) => e.id === id)?.name ?? "?";
    const todaySchedules = (schedules ?? []).filter((s) =>
      coversDay(s.start_at, s.end_at, s.all_day)
    );

    // 사무실 인원 집계 (오늘 기준)
    const officeAM: string[] = [];
    const officePM: string[] = [];
    const outAll: string[] = [];
    const byEmp = new Map<string, string>();

    for (const s of todaySchedules) {
      const cur = byEmp.get(s.employee_id) ?? "";
      const order = PRIORITY.indexOf(s.type as ScheduleType);
      const curOrder = cur ? PRIORITY.indexOf(cur as ScheduleType) : -1;
      if (cur === "" || order < curOrder) byEmp.set(s.employee_id, s.type);
    }
    for (const emp of employees ?? []) {
      const type = (byEmp.get(emp.id) ?? "WORK") as ScheduleType;
      const o = TYPE_OFFICE[type];
      if (o.am) officeAM.push(emp.name);
      if (o.pm) officePM.push(emp.name);
      if (!o.am && !o.pm) outAll.push(emp.name);
    }

    const lines: string[] = [];
    for (const s of todaySchedules) {
      lines.push(`- ${empName(s.employee_id)} : ${TYPE_LABEL[s.type] ?? s.type} ${s.title}`);
    }

    const fmt = (arr: string[]) => (arr.length ? arr.join(", ") : "(없음)");
    const text =
      `📅 ${dateStr} 일정/보고 요약\n` +
      (lines.length ? `**일정**\n${lines.join("\n")}` : `**일정** 없음`) +
      `\n\n**보고** ` +
      ((reports ?? []).length
        ? (reports ?? [])
            .map((r) => `- ${empName(r.employee_id)}: ${r.summary ?? r.content.slice(0, 30)}`)
            .join("\n")
        : "없음") +
      `\n\n🏢 사무실 인원\n` +
      `- 오전 (${officeAM.length}명): ${fmt(officeAM)}\n` +
      `- 오후 (${officePM.length}명): ${fmt(officePM)}` +
      `\n🚫 사무실 외 (출장/외근/휴가 등): ${fmt(outAll)}`;

    const isDiscord = /discord/i.test(webhook);
    // Slack: @channel 멘션으로 실시간 강조 (PC에서도 알림이 뜨도록)
    const body = isDiscord
      ? { content: text }
      : { text: "<!channel> " + text, link_names: true };
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
