import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function databaseUnavailable() {
  return Response.json(
    { error: "DATABASE_URL is missing. Copy .env.example to .env and add your PostgreSQL connection URL." },
    { status: 503 },
  );
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const name = typeof body === "object" && body !== null && "name" in body && typeof body.name === "string"
    ? body.name.trim()
    : "";

  if (!name || name.length > 120) {
    return Response.json({ error: "Project name must be between 1 and 120 characters." }, { status: 400 });
  }

  const { id } = await params;
  try {
    const project = await prisma.project.update({ where: { id }, data: { name } });
    return Response.json({ project });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return Response.json({ error: "Project not found." }, { status: 404 });
    }
    console.error("Failed to update project in PostgreSQL:", error);
    return Response.json({ error: "Could not update the project. Check the PostgreSQL connection and try again." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();

  const { id } = await params;
  try {
    await prisma.project.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return Response.json({ error: "Project not found." }, { status: 404 });
    }
    console.error("Failed to delete project from PostgreSQL:", error);
    return Response.json({ error: "Could not delete the project. Check the PostgreSQL connection and try again." }, { status: 503 });
  }
}