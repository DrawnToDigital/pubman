import { cookies } from "next/headers";

export async function UserBanner() {
    const cookieJar = await cookies();
    const username = cookieJar.get('username')?.value;
    let banner = "";
    if (username) {
        banner = `Hello ${username}!`;
    } else {
        banner = "Hello there!";
    }
    return (
        <h1 className="m-4 text-xl md:text-2xl">
            {banner}
        </h1>
    )
}