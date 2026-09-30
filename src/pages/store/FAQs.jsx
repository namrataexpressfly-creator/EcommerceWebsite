import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStoreSlug } from "../../context/StoreSlugContext";
import client from "../../api/client";
import { Loading, ErrorBox } from "../../components/Ui";

function FaqItem({ faq }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button type="button" className="faq-question" onClick={() => setOpen((o) => !o)}>
        <span>{faq.question}</span>
        <span className={`faq-chevron ${open ? "open" : ""}`}>⌄</span>
      </button>
      {open && <div className="faq-answer">{faq.answer}</div>}
    </div>
  );
}

export default function FAQs() {
  const { slug, basePath } = useStoreSlug();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    client
      .get(`/store/${slug}/faqs`)
      .then(({ data }) => setFaqs(data.faqs || []))
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Loading label="Loading FAQs…" />;

  return (
    <div className="store-page">
      <div className="page-header">
        <h1>Frequently Asked Questions</h1>
      </div>

      <ErrorBox message={error} />

      <section className="panel form-panel">
        {faqs.length === 0 ? (
          <p className="muted">
            No FAQs have been added yet. Still have a question? Visit our{" "}
            <Link to={`${basePath}/help`}>Help & Support</Link> page.
          </p>
        ) : (
          <div className="faq-list">
            {faqs.map((f, idx) => (
              <FaqItem key={idx} faq={f} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
