import { deletePluginSchedule, updatePluginSchedule } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { nextDailyRunAt, normalizeScheduleTime, normalizeTimezone } from "@/lib/schedules";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      timeOfDay?: string;
      timezone?: string;
      isEnabled?: boolean;
    };
    const update: Parameters<typeof updatePluginSchedule>[2] = {};
    if (typeof body.name === "string") update.name = body.name.trim() || "Daily active plugin run";
    if (typeof body.timeOfDay === "string") {
      update.time_of_day = normalizeScheduleTime(body.timeOfDay);
      update.next_run_at = nextDailyRunAt(update.time_of_day);
    }
    if (typeof body.timezone === "string") update.timezone = normalizeTimezone(body.timezone);
    if (typeof body.isEnabled === "boolean") update.is_enabled = body.isEnabled;

    const schedule = await updatePluginSchedule(user.id, id, update);
    return NextResponse.json(schedule);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update schedule.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await deletePluginSchedule(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete schedule.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
