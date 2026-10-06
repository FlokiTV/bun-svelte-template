const requestIds = new WeakMap<Request, string>();
const requestIdPattern = /^[A-Za-z0-9._:-]{8,128}$/;

export function requestIdFor(request: Request): string {
  const existing = requestIds.get(request);
  if (existing) return existing;

  const incoming = request.headers.get("x-request-id");
  const requestId = incoming && requestIdPattern.test(incoming) ? incoming : crypto.randomUUID();
  requestIds.set(request, requestId);
  return requestId;
}
