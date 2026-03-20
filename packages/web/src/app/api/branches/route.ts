import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { createGitParser, isValidRepo, getBranches } from "@git-compass/core";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const repoPath = searchParams.get("repoPath") || "../../";

    const parser = createGitParser(repoPath);
    const isValid = await isValidRepo(parser);

    if (!isValid) {
      return NextResponse.json({ error: "Not a valid Git repository" }, { status: 400 });
    }

    const branches = await getBranches(parser);
    return NextResponse.json({ branches });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed to fetch branches" }, { status: 500 });
  }
}
