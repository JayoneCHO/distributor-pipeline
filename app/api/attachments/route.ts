import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  const formData = await request.formData();
  const leadId = String(formData.get("leadId") || "");
  const redirectTo = String(formData.get("redirectTo") || `/leads/${leadId}`);
  const file = formData.get("file");

  if (!leadId || !file || typeof file === "string") {
    return NextResponse.redirect(new URL(`${redirectTo}?uploadError=1`, request.url));
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadDir = path.join(process.cwd(), "public", "uploads", leadId);
  await mkdir(uploadDir, { recursive: true });

  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const fullPath = path.join(uploadDir, safeName);
  await writeFile(fullPath, buffer);

  await prisma.attachment.create({
    data: {
      leadId,
      fileName: file.name,
      fileUrl: `/uploads/${leadId}/${safeName}`,
      fileType: file.type || "application/octet-stream",
    },
  });

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
