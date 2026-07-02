import { Liveblocks } from "@liveblocks/node";

 

// This is a TEMPORARY, insecure authentication endpoint for our prototype.

// In a production app, you would verify the user's identity here.

// See: https://liveblocks.io/docs/authentication/production-auth-endpoint

 

const liveblocks = new Liveblocks({

  secret: process.env.LIVEBLOCKS_SECRET_KEY, // You'll add this key next

});

 

export async function POST(request) {

  // For this demo, we're giving a generic user ID.

  const user = {

    id: "test-user-" + Math.floor(Math.random() * 1000),

    info: { name: "Test User" }

  };

 

  const { status, body } = await liveblocks.identifyUser(

    {

      userId: user.id,

      groupIds: [],

    },

    {

      userInfo: user.info,

    }

  );

 

  return new Response(body, { status });

}