import React, { useEffect, useRef, useState } from "react";
import {
  X,
  ImageSquare,
  UploadSimple,
  InstagramLogo,
  FacebookLogo,
  YoutubeLogo,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { mediaUrl, socialUrl, embedUrl, safeUrl } from "../lib/utils";
import { uploadImage } from "../lib/backend";
import { useMarket } from "../lib/context";
export function Modal({ title, onClose, children, side = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    ref.current.showModal();
    const close = () => onClose();
    ref.current.addEventListener("cancel", close);
    return () => {
      before?.focus();
    };
  }, []);
  return (
    <dialog
      className={side ? "dialog side" : "dialog"}
      ref={ref}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={22} />
        </button>
      </header>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
export function Photo({ src, alt = "", ...props }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && mediaUrl(src) && !failed ? (
    <img
      src={mediaUrl(src)}
      alt={alt}
      onError={() => setFailed(true)}
      {...props}
    />
  ) : (
    <div className="photo-fallback" role="img" aria-label={alt || "No photo"}>
      <ImageSquare size={32} />
      <span>Photo unavailable</span>
    </div>
  );
}
export function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
export function Empty({ title, children }) {
  return (
    <div className="empty">
      <ImageSquare size={36} weight="light" />
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
export function Upload({
  value,
  onChange,
  multiple = false,
  labels = [],
  onBusyChange,
}) {
  const { session } = useMarket();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [url, setUrl] = useState("");
  const items = multiple ? value || [] : value ? [value] : [];
  return (
    <div className="upload-widget">
      <div className="photo-strip">
        {items.map((p, i) => (
          <div key={p + i}>
            <Photo src={p} alt={labels[i] || `Uploaded photo ${i + 1}`} />
            <span className="photo-position">
              {labels[i] || `Photo ${i + 1}`}
            </span>
            {multiple && i > 0 && (
              <button
                className="photo-move"
                type="button"
                disabled={busy}
                aria-label={`Move photo ${i + 1} earlier`}
                onClick={() => {
                  const next = [...items];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  onChange(next);
                }}
              >
                ←
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              aria-label={`Remove photo ${i + 1}`}
              onClick={() =>
                onChange(multiple ? items.filter((_, n) => n !== i) : "")
              }
            >
              <X />
            </button>
          </div>
        ))}
      </div>
      <label className="upload-button">
        <UploadSimple size={20} />
        {busy ? "Uploading…" : "Upload photos"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          disabled={busy}
          onChange={async (e) => {
            setError("");
            setBusy(true);
            onBusyChange?.(true);
            try {
              if (!session) throw Error("Sign in to upload photos");
              const files = Array.from(e.target.files);
              if (files.length + items.length > 12 && multiple)
                throw Error("Up to 12 photos per item");
              const uploaded = [];
              for (const file of files)
                uploaded.push(await uploadImage(file, session.user.id));
              onChange(multiple ? [...items, ...uploaded] : uploaded[0]);
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
              onBusyChange?.(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      <small>
        JPG, PNG or WebP · up to 5 MB each
        {multiple ? " · up to 12 photos · use arrows to reorder" : ""}
      </small>
      <div className="media-url-row">
        <input
          aria-label="Photo URL"
          type="url"
          placeholder="Or paste an HTTPS photo URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          className="button outline"
          type="button"
          disabled={busy}
          onClick={() => {
            const safe = safeUrl(url);
            if (!safe) return setError("Enter an HTTPS photo URL");
            if (multiple && items.length >= 12)
              return setError("Up to 12 photos per item");
            onChange(multiple ? [...items, safe] : safe);
            setUrl("");
            setError("");
          }}
        >
          Add URL
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
const brands = {
  instagram: InstagramLogo,
  facebook: FacebookLogo,
  youtube: YoutubeLogo,
};
export function SocialLinks({ values = {} }) {
  return (
    <div className="social-icons">
      {Object.entries(values)
        .filter(([, url]) => socialUrl(url))
        .map(([name, url]) => {
          const Icon = brands[name] || ArrowSquareOut;
          return (
            <a
              key={name}
              href={socialUrl(url)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${name}`}
            >
              <Icon size={23} />
            </a>
          );
        })}
    </div>
  );
}
export function Video({ url }) {
  const [load, setLoad] = useState(false);
  const src = embedUrl(url);
  return (
    <div className="video-player">
      {load && src ? (
        <iframe
          src={src}
          title="Seller video"
          allow="encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button
          className="button outline"
          onClick={() => setLoad(true)}
          disabled={!src}
        >
          Play embedded video
        </button>
      )}
      <a href={socialUrl(url)} target="_blank" rel="noopener noreferrer">
        Open original post <ArrowSquareOut />
      </a>
      <small>Playback depends on the original post's availability.</small>
    </div>
  );
}
