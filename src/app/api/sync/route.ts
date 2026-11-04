import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { execSync } from "child_process";

export async function POST(req: NextRequest) {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { action } = await req.json();
  const cwd = process.cwd();
  try {
    if (action === "backup") {
      const out = execSync("bash scripts/backup.sh", { cwd, encoding: "utf-8" });
      return NextResponse.json({ ok: true, output: out.trim() });
    }
    if (action === "push" || action === "pull") {
      execSync("bash scripts/backup.sh", { cwd, encoding: "utf-8" });
      const out = execSync(`git ${action}`, { cwd, encoding: "utf-8", timeout: 15000 });
      return NextResponse.json({ ok: true, output: out.trim() || `git ${action} done` });
    }
    return NextResponse.json({ error: "action must be backup|push|pull" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message.split("\n").slice(-2).join(" ") : "sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
