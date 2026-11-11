import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL is missing. Configure the database connection to record stock movements." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const action = typeof body === "object" && body !== null && "action" in body && typeof body.action === "string" ? body.action : "";
  const quantity = typeof body === "object" && body !== null && "quantity" in body && typeof body.quantity === "number" ? body.quantity : NaN;
  const dateValue = typeof body === "object" && body !== null && "date" in body && typeof body.date === "string" ? body.date : "";
  const note = typeof body === "object" && body !== null && "note" in body && typeof body.note === "string" ? body.note.trim() : "";
  const movementDate = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? new Date(`${dateValue}T00:00:00.000Z`) : new Date(Number.NaN);

  if (!(action === "receive" || action === "sell" || action === "adjust") || !Number.isInteger(quantity) || quantity < (action === "adjust" ? 0 : 1) || Number.isNaN(movementDate.getTime()) || movementDate.toISOString().slice(0, 10) !== dateValue || note.length > 500) {
    return Response.json({ error: "Enter a valid action, whole quantity, date, and note (up to 500 characters)." }, { status: 400 });
  }

  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const currentProject = await transaction.project.findUnique({ where: { id }, select: { itemCount: true } });
      if (!currentProject) throw Object.assign(new Error("Inventory not found."), { code: "P2025" });

      const type = action === "receive" ? "IN" : action === "sell" ? "SALE" : "ADJUSTMENT";
      const quantityDelta = action === "receive" ? quantity : action === "sell" ? -quantity : quantity - currentProject.itemCount;
      const nextItemCount = currentProject.itemCount + quantityDelta;
      if (quantityDelta === 0) throw Object.assign(new Error("Adjustment must change the on-hand quantity."), { code: "NO_CHANGE" });
      if (nextItemCount < 0) throw Object.assign(new Error("Quantity cannot exceed stock on hand."), { code: "INSUFFICIENT_STOCK" });

      const project = await transaction.project.update({ where: { id }, data: { itemCount: nextItemCount } });
      const movement = await transaction.stockMovement.create({
        data: { projectId: id, type, quantityDelta, note: note || null, createdAt: movementDate },
      });
      return { project, movement };
    }, { isolationLevel: "Serializable" });

    return Response.json(result, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "P2025") return Response.json({ error: "Inventory not found." }, { status: 404 });
      if (error.code === "NO_CHANGE") return Response.json({ error: "Adjustment must change the on-hand quantity." }, { status: 400 });
      if (error.code === "INSUFFICIENT_STOCK") return Response.json({ error: "Quantity cannot exceed stock on hand." }, { status: 409 });
    }
    console.error("Failed to record stock movement:", error);
    return Response.json({ error: "Could not record this movement. Check the database connection and try again." }, { status: 503 });
  }
}