import React, { useState } from "react";
import { Field, Video } from "./UI";
import { uploadVideo } from "../lib/backend";
import { useMarket } from "../lib/context";
import { directVideoUrl } from "../lib/commerce";
export function ProductVideos({ videos = [] }) {
  return videos.length ? (
    <section className="product-videos">
      <h3>See it in motion</h3>
      {videos.map((v, i) => (
        <div key={v.url + i}>
          <h4>{v.title || "Product video"}</h4>
          {directVideoUrl(v.url) ? (
            <video
              controls
              playsInline
              preload="none"
              src={directVideoUrl(v.url)}
            >
              Your browser cannot play this video.{" "}
              <a href={directVideoUrl(v.url)}>Open video</a>
            </video>
          ) : (
            <Video url={v.url} />
          )}
        </div>
      ))}
    </section>
  ) : null;
}
export function ProductVideosEditor({ value = [], onChange, onBusyChange }) {
  const { session } = useMarket();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const edit = (i, k, v) =>
    onChange(value.map((x, n) => (n === i ? { ...x, [k]: v } : x)));
  return (
    <section className="video-editor">
      <h3>Videos & embedded posts</h3>
      <p className="muted">
        Add up to six YouTube, Instagram, Facebook, MP4 or WebM links. Public
        posts play when the provider permits embedding.
      </p>
      {value.map((v, i) => (
        <div key={i} className="video-editor-row">
          <Field
            label={"Video " + (i + 1) + " title"}
            maxLength={100}
            value={v.title}
            onChange={(e) => edit(i, "title", e.target.value)}
          />
          <Field
            label={"Video " + (i + 1) + " URL"}
            type="url"
            value={v.url}
            onChange={(e) => edit(i, "url", e.target.value)}
          />
          <button
            className="text-button"
            type="button"
            onClick={() => onChange(value.filter((_, n) => n !== i))}
          >
            Remove video {i + 1}
          </button>
        </div>
      ))}
      <div className="button-row">
        <button
          className="button outline"
          type="button"
          disabled={busy || value.length >= 6}
          onClick={() => onChange([...value, { title: "", url: "" }])}
        >
          Add video link
        </button>
        <label className="upload-button">
          {busy ? "Uploading video…" : "Upload a short video"}
          <input
            type="file"
            accept="video/mp4,video/webm"
            disabled={busy || value.length >= 6}
            onChange={async (e) => {
              const input = e.currentTarget;
              const file = input.files?.[0];
              if (!file) return;
              setBusy(true);
              onBusyChange?.(true);
              setError("");
              try {
                if (!session) throw Error("Sign in to upload videos");
                const url = await uploadVideo(file, session.user.id);
                onChange([
                  ...value,
                  { title: file.name.replace(/\.[^.]+$/, ""), url },
                ]);
              } catch (e) {
                setError(e.message);
              } finally {
                input.value = "";
                setBusy(false);
                onBusyChange?.(false);
              }
            }}
          />
        </label>
      </div>
      <small>
        MP4 / WebM · up to 6 MB. Use a hosted URL for longer videos.
      </small>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
