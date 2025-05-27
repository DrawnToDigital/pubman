import { NextResponse } from "next/server";
import { MakerWorldAPI } from "../../makerworld-lib";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }
    const api = new MakerWorldAPI();
    const resp = await api.login(email, password);
    return NextResponse.json(resp);
  } catch (err) {
    return NextResponse.json({ error: err.message || "Login failed" }, { status: 500 });
  }
}
