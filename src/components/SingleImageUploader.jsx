import { useRef, useState } from "react";
import { resolveMediaUrl } from "../api/client";

export default function SingleImageUploader({ value = "", onChange, uploadFn, label }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const doUpload = async (files) => {
    const file = files && files[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadFn(file);
      onChange(url);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    doUpload(e.dataTransfer.files);
  };

  if (value) {
    return (
      <div>
        <div className="image-single-preview">
          <img src={resolveMediaUrl(value)} alt="Uploaded" />
          <button
            type="button"
            className="image-thumb-remove"
            onClick={() => onChange("")}
            title="Remove image"
          >
            ×
          </button>
        </div>
        {error && (
          <div className="error-box" style={{ marginTop: 8 }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`image-dropzone ${dragOver ? "image-dropzone-active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            doUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="image-dropzone-icon">⬆</div>
        <div>
          {uploading ? (
            "Uploading…"
          ) : (
            <>
              Drag & drop an image here, or <span className="link">browse</span>
            </>
          )}
        </div>
        <div className="muted small">{label || "JPG, PNG, WEBP, GIF, AVIF · up to 5MB"}</div>
      </div>
      {error && (
        <div className="error-box" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
}
