import { NextResponse } from "next/server";
import { MakerWorldAPI } from "../../makerworld-lib";

export async function POST(req) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: "Missing email or code" }, { status: 400 });
    }
    const api = new MakerWorldAPI();
    const resp = await api.loginVerifyCode(email, code);
    return NextResponse.json(resp);
  } catch (err) {
    return NextResponse.json({ error: err.message || "Code verification failed" }, { status: 500 });
  }
}
