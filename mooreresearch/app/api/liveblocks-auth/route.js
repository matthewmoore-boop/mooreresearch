import { Liveblocks } from "@liveblocks/node";

export async function POST(request) {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret || !secret.startsWith('sk_')) {
    return new Response('Liveblocks is not configured. Set LIVEBLOCKS_SECRET_KEY to a valid sk_ key.', { status: 500 });
  }

  const liveblocks = new Liveblocks({ secret });

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