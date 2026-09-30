import { useEffect, useState } from "react";
import { useStoreSlug } from "../../context/StoreSlugContext";
import client, { resolveMediaUrl } from "../../api/client";
import { Loading, ErrorBox } from "../../components/Ui";

export default function Aboutus() {
  const { slug } = useStoreSlug();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    client
      .get(`/store/${slug}/pages`)
      .then(({ data }) => setPage(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Loading label="Loading…" />;

  return (
    <div className="info-page">
      <ErrorBox message={error} />
      {page && (
        <div className="info-page-inner">
          {page.about_image_url && (
            <div className="info-page-media">
              <img src={resolveMediaUrl(page.about_image_url)} alt={page.about_heading} />
            </div>
          )}
          <h1>{page.about_heading || "About us"}</h1>
          <p className="info-page-body">{page.about_body}</p>
        </div>
      )}
    </div>
  );
}
