type PlainDocument = {
  _id?: { toString: () => string };
  toObject?: () => Record<string, unknown>;
  [key: string]: unknown;
};

export function serializeDocument<T extends PlainDocument>(document: T) {
  const raw = document.toObject ? document.toObject() : document;
  const { _id, ...rest } = raw;
  delete rest.__v;

  return {
    id: _id?.toString(),
    ...JSON.parse(JSON.stringify(rest)),
  };
}

export function serializeDocuments<T extends PlainDocument>(documents: T[]) {
  return documents.map((document) => serializeDocument(document));
}
