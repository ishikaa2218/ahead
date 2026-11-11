import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AppHeader } from "../components/AppHeader";
import { Icon } from "../components/Icon";
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
    <div className="pj-page page">
      <AppHeader
        crumb="Before you start"
        onBrandClick={() => navigate("/dashboard")}
      />

      <main id="main" className="wrap wrap--wide pj-container">
        <div className="pj-preview">
          <div className={`pj-door ${camPerm === "granted" ? "pj-door--open" : ""}`}>
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
                <Icon name={camPerm === "denied" ? "camera-off" : "camera"} size={28} />
                <span>
                  {camPerm === "pending"
                    ? "Asking your browser for camera access…"
                    : "No camera yet"}
                </span>
              </div>
            )}

            {camPerm === "granted" && (
              <span className="pj-camera-label">
                This is you
              </span>
            )}
          </div>
          <div className="pj-floor-light" aria-hidden="true" />
        </div>

        <section className="pj-panel" aria-labelledby="pj-title">
          <p className="eyebrow">One quick check</p>
          <h1 id="pj-title" className="pj-title serif">
            At the door, <em>for a moment.</em>
          </h1>
          <p className="pj-sub">
            Take a minute to make sure your camera and mic are working.
            Once they're good, you're ready to go in.
          </p>

          {permissionDenied ? (
            <div className="pj-denied notice notice--error" role="alert">
              <Icon name="alert" className="notice__icon" />
              <div className="notice__body">
                <h2 className="pj-denied__title">
                  We can't reach your camera or mic yet
                </h2>

                <p>
                  Allow camera and microphone access in your browser settings,
                  then refresh this page. Take your time — the interview will
                  wait for you.
                </p>

                <button
                  type="button"
                  className="btn btn--sm btn--ghost pj-denied__btn"
                  onClick={() => window.location.reload()}
                >
                  Check again
                </button>
              </div>
            </div>
          ) : (
            <>
              <ul className="pj-checks" aria-live="polite">
                <li className={`pj-check ${camPerm === "granted" ? "pj-check--ok" : ""}`}>
                  <span className="pj-check__icon" aria-hidden="true">
                    {camPerm === "granted" ? <Icon name="check" size={16} /> : <span className="pj-check__spinner" />}
                  </span>
                  <span className="pj-check__text">
                    <strong>Camera</strong>
                    <span>{camPerm === "granted" ? "Camera's good" : "Checking your camera…"}</span>
                  </span>
                </li>

                <li className={`pj-check ${micPerm === "granted" ? "pj-check--ok" : ""}`}>
                  <span className="pj-check__icon" aria-hidden="true">
                    {micPerm === "granted" ? <Icon name="check" size={16} /> : <span className="pj-check__spinner" />}
                  </span>
                  <span className="pj-check__text">
                    <strong>Microphone</strong>
                    <span>{micPerm === "granted" ? "Mic's good" : "Checking your mic…"}</span>
                  </span>
                </li>
              </ul>

              {micPerm === "granted" && (
                <div className="pj-mic-level">
                  <div className="pj-mic-header">
                    <span>Your mic level</span>
                    <span className={micLevel > 10 ? "pj-mic-ok" : ""}>
                      {micLevel > 10
                        ? "Sounds good"
                        : "Say something to test"}
                    </span>
                  </div>

                  <div
                    className="pj-mic-track"
                    role="meter"
                    aria-label="Microphone level"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(micLevel)}
                  >
                    <div
                      className="pj-mic-fill"
                      style={{
                        width: `${micLevel}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <p className="pj-tip serif">
                “Somewhere quiet, headphones if you have them.”
              </p>

              <div className="pj-actions">
                <button
                  type="button"
                  className="btn btn--amber pj-go"
                  disabled={!allGranted}
                  onClick={startInterview}
                >
                  Go ahead, I'm ready
                  <span className="btn__arrow" aria-hidden="true">→</span>
                </button>
              </div>

              <p className="pj-note meta">
                Your camera and mic are only on during the interview, never
                before.
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
