import { useEffect, useState } from "react";
import { useStoreSlug } from "../../context/StoreSlugContext";
import client from "../../api/client";
import { Loading, ErrorBox } from "../../components/Ui";

export default function Privacy() {
  const { slug } = useStoreSlug();

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) {
      setError("Store slug is missing.");
      setLoading(false);
      return;
    }

    const loadPrivacy = async () => {
      try {
        setLoading(true);
        setError("");

        const { data } = await client.get(
          `/store/${slug}/privacy-policy`
        );

        console.log("PRIVACY DATA:", data);

        setPage(data);
      } catch (err) {
        console.error("PRIVACY LOAD ERROR:", err);

        setError(
          err.response?.data?.error ||
            err.message ||
            "Failed to load Privacy Policy"
        );
      } finally {
        setLoading(false);
      }
    };

    loadPrivacy();
  }, [slug]);

  if (loading) {
    return <Loading label="Loading Privacy Policy…" />;
  }

  if (error) {
    return (
      <div className="store-page">
        <div className="page-header">
          <h1>Privacy Policy</h1>
        </div>

        <ErrorBox message={error} />
      </div>
    );
  }

  return (
    <div className="store-page">
      <div className="page-header">
        <h1>{page?.privacy_heading || "Privacy Policy"}</h1>
      </div>

      <section className="panel form-panel">
        {page?.privacy_body ? (
       
          <div
            className="info-page-body rich-text-content"
            dangerouslySetInnerHTML={{ __html: page.privacy_body }}
          />
        ) : (
          <div className="info-page-body">
            <p>Privacy Policy information is not available.</p>
          </div>
        )}
      </section>
    </div>
  );
}
