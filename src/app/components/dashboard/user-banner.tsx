export async function UserBanner() {
    const username = "default"; // TODO: get from session
    let banner = "";
    if (username && username !== "default") {
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