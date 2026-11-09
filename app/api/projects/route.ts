import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL is missing. Copy .env.example to .env and add your PostgreSQL connection URL." }, { status: 503 });
  }

  try {
    const projects = await prisma.project.findMany({ orderBy: { createdAt: "desc" } });
    return Response.json({ projects });
  } catch (error) {
    console.error("Failed to load projects from PostgreSQL:", error);
    return Response.json({ error: "Database unavailable. Check DATABASE_URL and ensure PostgreSQL is running." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL is missing. Copy .env.example to .env and add your PostgreSQL connection URL." }, { status: 503 });
  }

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

  try {
    const project = await prisma.project.create({
      data: { name, itemCount, source: source || null, arrivalDate, code: `PRJ-${randomUUID().slice(0, 8).toUpperCase()}` },
    });
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Failed to create project in PostgreSQL:", error);
    return Response.json({ error: "Could not save the project. Check the PostgreSQL connection and try again." }, { status: 503 });
  }
}