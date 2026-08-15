import {
  completePluginScheduleRun,
  failPluginScheduleRun,
  getDuePluginSchedules,
  getRunnableFeedSources,
} from "@/lib/data";
import { nextDailyRunAt } from "@/lib/schedules";
import { syncFeedSourceForUser } from "@/lib/sync";
import { NextResponse } from "next/server";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized scheduler run." }, { status: 401 });
  }

  const schedules = await getDuePluginSchedules();
  const results = [];

  for (const schedule of schedules) {
    const nextRunAt = nextDailyRunAt(schedule.time_of_day);
    try {
      if (!schedule.user_id) {
        throw new Error("Schedule has no owner.");
      }
      const sources = await getRunnableFeedSources(schedule.user_id);
      let inserted = 0;
      let discovered = 0;
      let failed = 0;

      for (const source of sources) {
        try {
          const result = await syncFeedSourceForUser(schedule.user_id, source);
          inserted += result.inserted;
          discovered += result.discovered;
        } catch {
          failed += 1;
        }
      }

      if (failed) {
        await failPluginScheduleRun(schedule.id, nextRunAt, `${failed} source${failed === 1 ? "" : "s"} failed during scheduled sync.`);
      } else {
        await completePluginScheduleRun(schedule.id, nextRunAt, inserted);
      }
      results.push({ scheduleId: schedule.id, sources: sources.length, discovered, inserted, failed });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scheduled sync failed.";
      await failPluginScheduleRun(schedule.id, nextRunAt, message);
      results.push({ scheduleId: schedule.id, error: message });
    }
  }

  return NextResponse.json({ checked: schedules.length, results });
}

export const GET = POST;
