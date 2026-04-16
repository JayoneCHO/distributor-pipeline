import { NextResponse } from "next/server";

export async function POST() {
  // Future hook: Gmail OAuth token storage + message sync job trigger.
  return NextResponse.json({ status: "placeholder", message: "Attach Gmail sync logic here." }, { status: 501 });
}
