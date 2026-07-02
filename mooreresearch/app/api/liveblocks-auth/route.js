import { Liveblocks } from "@liveblocks/node";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY,
});

export async function POST(request) {
  const user = {
    id: "test-user-" + Math.floor(Math.random() * 1000),
    info: { name: "Test User", color: "#f783ac" }
  };
  const { status, body } = await liveblocks.identifyUser(
    { userId: user.id, groupIds: [] },
    { userInfo: user.info }
  );
  return new Response(body, { status });
}