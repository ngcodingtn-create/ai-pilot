function readClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
}

export function GET(request: Request) {
  return Response.json(
    { ip: readClientIp(request) },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
