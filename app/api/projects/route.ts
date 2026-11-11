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
  const lowStockLimit = typeof body === "object" && body !== null && "lowStockLimit" in body && typeof body.lowStockLimit === "number"
    ? body.lowStockLimit
    : 0;
  const unitCost = typeof body === "object" && body !== null && "unitCost" in body && typeof body.unitCost === "number"
    ? body.unitCost
    : null;
  const currencyValue = typeof body === "object" && body !== null && "currency" in body && typeof body.currency === "string"
    ? body.currency.trim().toUpperCase()
    : "";
  const source = typeof body === "object" && body !== null && "source" in body && typeof body.source === "string"
    ? body.source.trim()
    : "";
  const arrivalDateValue = typeof body === "object" && body !== null && "arrivalDate" in body && typeof body.arrivalDate === "string"
    ? body.arrivalDate
    : "";
  const arrivalDate = arrivalDateValue ? new Date(`${arrivalDateValue}T00:00:00.000Z`) : null;

  if (!name || name.length > 120 || !Number.isInteger(itemCount) || itemCount < 0 || !Number.isInteger(lowStockLimit) || lowStockLimit < 0 || (unitCost !== null && (!Number.isFinite(unitCost) || unitCost < 0)) || (unitCost !== null && !/^[A-Z]{3}$/.test(currencyValue)) || (source.length > 120) || (arrivalDate && Number.isNaN(arrivalDate.getTime()))) {
    return Response.json({ error: "Enter valid inventory details, a non-negative stock limit, and a cost with a three-letter currency." }, { status: 400 });
  }

  try {
    const project = await prisma.$transaction(async (transaction) => {
      const createdProject = await transaction.project.create({
        data: { name, itemCount, lowStockLimit, unitCost, currency: unitCost === null ? null : currencyValue, source: source || null, arrivalDate, code: `PRJ-${randomUUID().slice(0, 8).toUpperCase()}` },
      });
      if (itemCount > 0) {
        await transaction.stockMovement.create({
          data: { projectId: createdProject.id, type: "IN", quantityDelta: itemCount, note: "Opening stock", createdAt: arrivalDate ?? new Date() },
        });
      }
      return createdProject;
    });
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Failed to create project in PostgreSQL:", error);
    return Response.json({ error: "Could not save the project. Check the PostgreSQL connection and try again." }, { status: 503 });
  }
}