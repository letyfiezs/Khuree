import { getCurrentUser, updateAccount } from "@/lib/auth/local-auth";
export const runtime = "nodejs";
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const body = (await request.json()) as {
    name?: string;
    currentPassword?: string;
    adultEnabled?: boolean;
    parentalPin?: string;
  };
  if (!body.name?.trim() || !body.currentPassword)
    return Response.json(
      { error: "Нэр болон одоогийн нууц үгээ оруулна уу." },
      { status: 400 },
    );
  if (body.parentalPin && !/^\d{4}$/.test(body.parentalPin))
    return Response.json(
      { error: "Parental PIN яг 4 оронтой байна." },
      { status: 400 },
    );
  try {
    await updateAccount(user.id, {
      name: body.name,
      currentPassword: body.currentPassword,
      adultEnabled: Boolean(body.adultEnabled),
      parentalPin: body.parentalPin,
    });
    return Response.json({ saved: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Хадгалж чадсангүй." },
      { status: 400 },
    );
  }
}
