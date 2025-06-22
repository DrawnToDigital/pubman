import { NextResponse } from "next/server";
import { MakerWorldAPI } from "../../makerworld-lib";

export async function POST(req) {
  let resp = null;
  try {
    const { tfaCode, tfaKey } = await req.json();
    if (!tfaCode || !tfaKey) {
      return NextResponse.json({ error: "Missing tfaCode or tfaKey" }, { status: 400 });
    }
    const api = new MakerWorldAPI();
    resp = await api.loginVerifyTfaCode(tfaCode, tfaKey);
    return NextResponse.json(resp);
  } catch (err) {
    console.error("TFA verification error:", err, "Response:", resp);
    return NextResponse.json({ error: err.message || "TFA verification failed" }, { status: 500 });
  }
}
