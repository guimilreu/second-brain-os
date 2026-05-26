import { noteFolderCreateSchema } from "@/features/notes/lib/schemas";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { created, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { NoteFolder } from "@/models/NoteFolder";

function folderListItem(doc: {
  _id: { toString: () => string };
  name: string;
  sortOrder?: number;
}) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    sortOrder: doc.sortOrder ?? 0,
  };
}

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const folders = await NoteFolder.find({ userId: user.userId })
      .sort({ sortOrder: 1, name: 1 })
      .limit(200)
      .lean();

    return ok(
      folders.map((f) => folderListItem(f as Parameters<typeof folderListItem>[0])),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const body = noteFolderCreateSchema.parse(await request.json());
    const maxOrder = await NoteFolder.findOne({ userId: user.userId })
      .sort({ sortOrder: -1 })
      .select("sortOrder")
      .lean();
    const nextOrder =
      body.sortOrder ??
      (typeof maxOrder?.sortOrder === "number" ? maxOrder.sortOrder + 1 : 0);

    const folder = await NoteFolder.create({
      userId: user.userId,
      name: body.name,
      sortOrder: nextOrder,
    });

    return created(serializeDocument(folder));
  } catch (error) {
    return handleApiError(error);
  }
}
