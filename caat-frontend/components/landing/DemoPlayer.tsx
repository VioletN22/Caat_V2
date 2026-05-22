"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Demo player: YouTube first (so the public landing page leans on YouTube's
 * CDN, not our storage), with a Supabase-hosted MP4 as the fallback that only
 * loads if the YouTube embed fails (private/embedding-disabled/blocked).
 *
 * We use the YouTube IFrame Player API rather than a bare <iframe> because a
 * blocked iframe does not fire a normal error event. The Player API's onError
 * (codes 100/101/150 = unavailable / embedding disabled) is the reliable
 * signal to fall back; a readiness timeout is the backstop.
 */

const YT_VIDEO_ID = "ESIc6o3kMpk";
// Public object URLs in the dedicated, public "demo-media" bucket.
const FALLBACK_SRC = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/demo-media/caat-demo.mp4`;
const POSTER_SRC = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/demo-media/caat-demo-poster.png`;

interface YTPlayer {
  destroy: () => void;
}
interface YTPlayerEvent {
  data?: number;
}
declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, number>;
          events?: {
            onReady?: (e: YTPlayerEvent) => void;
            onError?: (e: YTPlayerEvent) => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function DemoPlayer() {
  const [failed, setFailed] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (failed) return;
    let cancelled = false;

    const createPlayer = () => {
      if (cancelled || !window.YT?.Player || !mountRef.current) return;
      playerRef.current = new window.YT.Player(mountRef.current, {
        videoId: YT_VIDEO_ID,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            readyRef.current = true;
          },
          onError: () => {
            if (!cancelled) setFailed(true);
          },
        },
      });
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      if (!document.getElementById("yt-iframe-api")) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    // Backstop: if the player never signals ready (e.g. silently blocked),
    // fall back to the Supabase MP4.
    const t = setTimeout(() => {
      if (!cancelled && !readyRef.current) setFailed(true);
    }, 7000);

    return () => {
      cancelled = true;
      clearTimeout(t);
      try {
        playerRef.current?.destroy();
      } catch {
        /* noop */
      }
    };
  }, [failed]);

  if (failed) {
    return (
      <div className="aspect-video w-full">
        <video className="demo-video block h-full w-full" controls preload="metadata" playsInline poster={POSTER_SRC}>
          <source src={FALLBACK_SRC} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full">
      <div ref={mountRef} className="h-full w-full" />
    </div>
  );
}
