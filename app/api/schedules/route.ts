import { createPluginSchedule, getPluginSchedules } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { nextDailyRunAt, normalizeScheduleTime, normalizeTimezone } from "@/lib/schedules";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await requireUser();
    const schedules = await getPluginSchedules(user.id);
    return NextResponse.json({ schedules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load schedules.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      name?: string;
      timeOfDay?: string;
      timezone?: string;
      isEnabled?: boolean;
    };
    const timeOfDay = normalizeScheduleTime(body.timeOfDay);
    const schedule = await createPluginSchedule(user.id, {
      name: body.name?.trim() || "Daily active plugin run",
      time_of_day: timeOfDay,
      timezone: normalizeTimezone(body.timezone),
      is_enabled: body.isEnabled ?? true,
      next_run_at: nextDailyRunAt(timeOfDay),
    });
    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save schedule.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
