import { prisma } from "@/lib/prisma";

const ranges = {
  "7d": 7,
  "30d": 30,
  "12m": 365,
} as const;

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL is missing. Configure the database connection to load the dashboard." }, { status: 503 });
  }

  const requestedRange = new URL(request.url).searchParams.get("range");
  const range = requestedRange && requestedRange in ranges ? requestedRange as keyof typeof ranges : "7d";
  const from = new Date();
  if (range === "12m") from.setMonth(from.getMonth() - 12);
  else from.setDate(from.getDate() - ranges[range]);

  try {
    const [projects, movementTotals, latestMovements] = await Promise.all([
      prisma.project.findMany({
        select: { id: true, name: true, code: true, itemCount: true, lowStockLimit: true, unitCost: true, currency: true, source: true, status: true },
        orderBy: { name: "asc" },
      }),
      prisma.stockMovement.groupBy({
        by: ["projectId", "type"],
        _sum: { quantityDelta: true },
        where: { createdAt: { gte: from } },
      }),
      prisma.stockMovement.findMany({
        where: { createdAt: { gte: from } },
        take: 50,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          quantityDelta: true,
          note: true,
          createdAt: true,
          project: { select: { id: true, name: true, code: true } },
        },
      }),
    ]);

    const sources = new Map<string, number>();
    for (const project of projects) {
      const source = project.source?.trim() || "Unspecified";
      sources.set(source, (sources.get(source) ?? 0) + 1);
    }

    const receivedUnits = movementTotals.filter((movement) => movement.type === "IN").reduce((total, movement) => total + (movement._sum.quantityDelta ?? 0), 0);
    const issuedUnits = Math.abs(movementTotals.filter((movement) => movement.type === "OUT" || movement.type === "SALE").reduce((total, movement) => total + (movement._sum.quantityDelta ?? 0), 0));
    const adjustedUnits = movementTotals.filter((movement) => movement.type === "ADJUSTMENT").reduce((total, movement) => total + (movement._sum.quantityDelta ?? 0), 0);
    const stockedProjects = projects.filter((project) => project.itemCount > 0);
    const currencies = new Set(stockedProjects.map((project) => project.currency));
    const inventoryValueAvailable = stockedProjects.length > 0
      && stockedProjects.every((project) => project.unitCost !== null && project.currency !== null)
      && currencies.size === 1;
    const inventoryValueCurrency = inventoryValueAvailable ? stockedProjects[0].currency : null;
    const inventoryValueAmount = inventoryValueAvailable
      ? stockedProjects.reduce((total, project) => total + Number(project.unitCost) * project.itemCount, 0)
      : null;
    const lowStock = projects.filter((project) => project.lowStockLimit > 0 && project.itemCount <= project.lowStockLimit);

    return Response.json({
      range,
      summary: {
        inventoryCount: projects.length,
        unitsOnHand: projects.reduce((total, project) => total + project.itemCount, 0),
        inProgressCount: projects.filter((project) => project.status === "IN_PROGRESS").length,
        completedCount: projects.filter((project) => project.status === "COMPLETED").length,
        receivedUnits,
        issuedUnits,
        adjustedUnits,
        lowStockCount: lowStock.length,
      },
      inventoryValue: { available: inventoryValueAvailable, amount: inventoryValueAmount, currency: inventoryValueCurrency },
      lowStock: lowStock.map(({ id, name, code, itemCount, lowStockLimit }) => ({ id, name, code, itemCount, lowStockLimit })),
      sources: [...sources.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
        .slice(0, 5),
      inventoryMovement: projects.map((project) => {
        const totals = movementTotals.filter((movement) => movement.projectId === project.id);
        const received = totals.find((movement) => movement.type === "IN")?._sum.quantityDelta ?? 0;
        const dispatched = totals.filter((movement) => movement.type === "OUT" || movement.type === "SALE").reduce((total, movement) => total + (movement._sum.quantityDelta ?? 0), 0);
        const adjusted = totals.find((movement) => movement.type === "ADJUSTMENT")?._sum.quantityDelta ?? 0;
        return { id: project.id, name: project.name, code: project.code, itemCount: project.itemCount, received, dispatched: Math.abs(dispatched), adjusted };
      }),
      latestMovements,
    });
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
    return Response.json({
      error: "Could not load dashboard data. Check the database connection and schema.",
      ...(process.env.NODE_ENV === "development" && error instanceof Error ? { details: error.message } : {}),
    }, { status: 503 });
  }
}