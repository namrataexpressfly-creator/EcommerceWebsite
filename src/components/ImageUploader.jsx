import { useRef, useState } from "react";
import { uploadProductImages, resolveMediaUrl } from "../api/client";

export default function ImageUploader({ value = [], onChange }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const doUpload = async (files) => {
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);
    try {
      const urls = await uploadProductImages(files);
      onChange([...value, ...urls]);
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

  const removeAt = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

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
          multiple
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
              Drag & drop images here, or <span className="link">browse</span>
            </>
          )}
        </div>
        <div className="muted small">JPG, PNG, WEBP, GIF, AVIF · up to 5MB each</div>
      </div>

      {error && <div className="error-box" style={{ marginTop: 8 }}>{error}</div>}

      {value.length > 0 && (
        <div className="image-thumb-grid">
          {value.map((url, idx) => (
            <div className="image-thumb" key={url + idx}>
              <img src={resolveMediaUrl(url)} alt={`Product ${idx + 1}`} />
              <button
                type="button"
                className="image-thumb-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(idx);
                }}
                title="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
