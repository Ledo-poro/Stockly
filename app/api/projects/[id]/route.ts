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
  const itemCount = typeof body === "object" && body !== null && "itemCount" in body && typeof body.itemCount === "number"
    ? body.itemCount
    : NaN;
  const source = typeof body === "object" && body !== null && "source" in body && typeof body.source === "string"
    ? body.source.trim()
    : "";
  const arrivalDateValue = typeof body === "object" && body !== null && "arrivalDate" in body && typeof body.arrivalDate === "string"
    ? body.arrivalDate
    : "";
  const arrivalDate = arrivalDateValue ? new Date(`${arrivalDateValue}T00:00:00.000Z`) : null;

  if (!name || name.length > 120 || !Number.isInteger(itemCount) || itemCount < 0 || source.length > 120 || (arrivalDate && Number.isNaN(arrivalDate.getTime()))) {
    return Response.json({ error: "Enter a name, a non-negative whole item count, and valid source and arrival date values." }, { status: 400 });
  }

  const { id } = await params;
  try {
    const project = await prisma.project.update({ where: { id }, data: { name, itemCount, source: source || null, arrivalDate } });
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