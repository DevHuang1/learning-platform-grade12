import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const answerId = Number(new URL(request.url).searchParams.get("answerId"));
    if (!Number.isInteger(answerId) || answerId <= 0) {
      return NextResponse.json({ error: "A valid answerId is required." }, { status: 400 });
    }

    const client = await createServerSupabase();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const { data: answer, error } = await client
      .from("exam_answers")
      .select("id, file_path, image_path, file_mime_type, file_name, exam_submissions!inner(user_id)")
      .eq("id", answerId)
      .single();
    if (error || !answer) {
      return NextResponse.json({ error: "Answer file not found." }, { status: 404 });
    }

    const raw = answer as unknown as {
      file_path: string | null;
      image_path: string | null;
      file_mime_type: string | null;
      file_name: string | null;
      exam_submissions:
        | { user_id: string | null }
        | Array<{ user_id: string | null }>;
    };
    const submission = Array.isArray(raw.exam_submissions)
      ? raw.exam_submissions[0]
      : raw.exam_submissions;
    const isTeacher = await client.rpc("is_teacher");
    if (isTeacher.error) {
      return NextResponse.json({ error: isTeacher.error.message }, { status: 500 });
    }
    if (!isTeacher.data && submission?.user_id !== user.id) {
      return NextResponse.json({ error: "You cannot access this answer file." }, { status: 403 });
    }

    const path = raw.file_path || raw.image_path;
    if (!path) return NextResponse.json({ error: "This answer has no file." }, { status: 404 });

    const admin = createAdminSupabase();
    const { data: file, error: downloadError } = await admin.storage
      .from("exam-answers")
      .download(path);
    if (downloadError || !file) {
      return NextResponse.json(
        { error: downloadError?.message || "Could not read answer file." },
        { status: 404 },
      );
    }

    return new NextResponse(file, {
      headers: {
        "Content-Type": raw.file_mime_type || "application/octet-stream",
        "Content-Disposition": `inline; filename="${(raw.file_name || "answer").replace(/[^a-z0-9._-]+/gi, "-")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read answer file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
