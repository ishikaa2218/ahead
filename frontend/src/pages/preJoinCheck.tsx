import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import "../stylesheets/preJoinCheck.css";

type PermState = "pending" | "granted" | "denied";

export function PreJoinCheck() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [camPerm, setCamPerm] = useState<PermState>("pending");
  const [micPerm, setMicPerm] = useState<PermState>("pending");
  const [micLevel, setMicLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let mounted = true;

    async function requestDevices() {
      try {
        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        setCamPerm("granted");
        setMicPerm("granted");

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          try {
            await videoRef.current.play();
          } catch (error) {
            console.error("Video playback failed:", error);
          }
        }

        // Microphone level meter
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const source =
          audioContext.createMediaStreamSource(stream);

        const analyser =
          audioContext.createAnalyser();

        analyser.fftSize = 256;

        source.connect(analyser);

        const data =
          new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (!mounted) return;

          analyser.getByteFrequencyData(data);

          const average =
            data.reduce((total, value) => total + value, 0) /
            data.length;

          setMicLevel(
            Math.min(100, average * 2.5),
          );

          animFrameRef.current =
            requestAnimationFrame(tick);
        };

        animFrameRef.current =
          requestAnimationFrame(tick);
      } catch (error) {
        console.error(
          "Camera/microphone permission error:",
          error,
        );

        if (!mounted) return;

        setCamPerm("denied");
        setMicPerm("denied");
      }
    }

    requestDevices();

    return () => {
      mounted = false;

      cancelAnimationFrame(animFrameRef.current);

      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (
      camPerm === "granted" &&
      videoRef.current &&
      streamRef.current
    ) {
      videoRef.current.srcObject =
        streamRef.current;
    }
  }, [camPerm]);

  function stopStream() {
    streamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    streamRef.current = null;

    cancelAnimationFrame(animFrameRef.current);

    if (audioContextRef.current) {
      audioContextRef.current
        .close()
        .catch(() => {});

      audioContextRef.current = null;
    }
  }

  function startInterview() {
    if (!id) return;

    stopStream();

    navigate(`/interview/ai/${id}`);
  }

  const allGranted =
    camPerm === "granted" &&
    micPerm === "granted";

  const permissionDenied =
    camPerm === "denied" ||
    micPerm === "denied";

  return (
    <div className="pj-page">
      <nav className="pj-nav">
        <button
          type="button"
          className="pj-logo"
          onClick={() => navigate("/dashboard")}
        >
          Ahead<span>.</span>
        </button>

        <span className="pj-nav-tag">
          Before you start
        </span>
      </nav>

      <main className="pj-container">
        <div className="pj-heading">
          <div className="pj-heading-badge">
            ONE QUICK CHECK
          </div>

          {/* <h1 className="pj-title">
            Let's check your setup
          </h1> */}

          <p className="pj-sub">
            Take a minute to make sure your camera and mic are working.
            Once they're good, you're ready to go in.
          </p>
        </div>

        {/* Camera preview */}

        <div className="pj-preview-wrap">
          {camPerm === "granted" ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="pj-video"
              onLoadedMetadata={(event) => {
                event.currentTarget
                  .play()
                  .catch(console.error);
              }}
            />
          ) : (
            <div className="pj-no-cam">
              {camPerm === "pending"
                ? "Asking your browser for camera access…"
                : "No camera yet"}
            </div>
          )}

          {camPerm === "granted" && (
            <div className="pj-camera-label">
              This is you
            </div>
          )}
        </div>

        {permissionDenied ? (
          <div className="pj-denied">
            <div className="pj-denied-icon">
              !
            </div>

            <h3>
              We can't reach your camera or mic yet
            </h3>

            <p>
              Allow camera and microphone access in your browser settings,
              then refresh this page. Take your time — the interview will
              wait for you.
            </p>

            <button
              type="button"
              className="pj-btn-secondary"
              onClick={() => window.location.reload()}
            >
              Check again
            </button>
          </div>
        ) : (
          <>
            {/* Permissions */}

            <div className="pj-status-row">
              <div
                className={`pj-chip ${
                  camPerm === "granted"
                    ? "pj-chip-ok"
                    : "pj-chip-wait"
                }`}
              >
                {camPerm === "granted"
                  ? "● Camera's good"
                  : "○ Checking your camera…"}
              </div>

              <div
                className={`pj-chip ${
                  micPerm === "granted"
                    ? "pj-chip-ok"
                    : "pj-chip-wait"
                }`}
              >
                {micPerm === "granted"
                  ? "● Mic's good"
                  : "○ Checking your mic…"}
              </div>
            </div>

            {/* Mic meter */}

            {micPerm === "granted" && (
              <div className="pj-mic-level">
                <div className="pj-mic-header">
                  <span>
                    Your mic level
                  </span>

                  <span>
                    {micLevel > 10
                      ? "Sounds good"
                      : "Say something to test"}
                  </span>
                </div>

                <div className="pj-mic-track">
                  <div
                    className="pj-mic-fill"
                    style={{
                      width: `${micLevel}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}

            <div className="pj-actions">
              <button
                type="button"
                className="pj-btn-primary"
                disabled={!allGranted}
                onClick={startInterview}
              >
                Go ahead, I'm ready
                <span>→</span>
              </button>
            </div>

            <p className="pj-note">
              Your camera and mic are only on during the interview, never
              before.
            </p>
          </>
        )}
      </main>
    </div>
  );
}