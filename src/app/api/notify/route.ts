import { NextResponse } from "next/server";
import { getClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
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
        client
          .from("schedules")
          .select("*")
          .lte("start_at", `${dateStr}T23:59:59`)
          .gte("end_at", `${dateStr}T00:00:00`),
        client.from("reports").select("*").eq("report_date", dateStr),
      ]);

    const empName = (id: string) =>
      (employees ?? []).find((e) => e.id === id)?.name ?? "?";
    const waiters = new Set<string>();

    const lines: string[] = [];
    for (const s of schedules ?? []) {
      const typeLabel: Record<string, string> = {
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
      if (["LEAVE", "ANNUAL", "HALF", "HALF_AM", "HALF_PM", "TRIP", "FIELD", "REMOTE"].includes(s.type)) {
        waiters.add(empName(s.employee_id));
      }
      lines.push(`- ${empName(s.employee_id)} : ${typeLabel[s.type] ?? s.type} ${s.title}`);
    }

    const text =
      `📅 ${dateStr} 일정/보고 요약\n` +
      (lines.length ? `**일정**\n${lines.join("\n")}` : "**일정** 없음") +
      `\n\n**보고** ` +
      ((reports ?? []).length
        ? (reports ?? [])
            .map((r) => `- ${empName(r.employee_id)}: ${r.summary ?? r.content.slice(0, 30)}`)
            .join("\n")
        : "없음") +
      (waiters.size ? `\n\n🚫 사무실 외 인원: ${Array.from(waiters).join(", ")}` : "");

    // webhook 형식 판별 (discord/slack)
    const body = /discord/i.test(webhook)
      ? { content: text }
      : { text };
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
