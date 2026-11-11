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
  const lowStockLimit = typeof body === "object" && body !== null && "lowStockLimit" in body && typeof body.lowStockLimit === "number"
    ? body.lowStockLimit
    : NaN;
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

  if (!name || name.length > 120 || !Number.isInteger(lowStockLimit) || lowStockLimit < 0 || (unitCost !== null && (!Number.isFinite(unitCost) || unitCost < 0)) || (unitCost !== null && !/^[A-Z]{3}$/.test(currencyValue)) || source.length > 120 || (arrivalDate && Number.isNaN(arrivalDate.getTime()))) {
    return Response.json({ error: "Enter valid inventory details, a non-negative stock limit, and a cost with a three-letter currency." }, { status: 400 });
  }

  const { id } = await params;
  try {
    const project = await prisma.project.update({
      where: { id },
      data: { name, lowStockLimit, unitCost, currency: unitCost === null ? null : currencyValue, source: source || null, arrivalDate },
    });
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