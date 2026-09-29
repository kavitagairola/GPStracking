import { recordGpsPoints } from "@/lib/gpsHistoryStore";
import { fetchMillitrackGps } from "@/lib/millitrack";

export const dynamic = "force-dynamic";

export async function GET() {
  let updateInterval = null;
  let keepAliveInterval = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (eventName, payload) => {
        try {
          controller.enqueue(new TextEncoder().encode(
            `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`
          ));
        } catch {
          // The client has disconnected.
        }
      };

      const pushGps = async () => {
        try {
          const { objects, refreshed, stale } = await fetchMillitrackGps();
          if (!Array.isArray(objects) || objects.length === 0) {
            throw new Error("Empty response from Millitrack API");
          }

          if (refreshed) recordGpsPoints(objects);
          send("gps", {
            success: true,
            data: { object: objects },
            stale,
            ts: Date.now(),
          });
        } catch {
          send("gps-error", {
            success: false,
            error: "Live GPS data is currently unavailable.",
            ts: Date.now(),
          });
        }
      };

      await pushGps();
      updateInterval = setInterval(pushGps, 2000);
      keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": ping\n\n"));
        } catch {
          // The client has disconnected.
        }
      }, 15000);
    },

    cancel() {
      if (updateInterval) clearInterval(updateInterval);
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}