
import { useEffect, useState } from "react";
import { useStoreSlug } from "../../context/StoreSlugContext";
import client from "../../api/client";
import { Loading, ErrorBox } from "../../components/Ui";
import { firstError, isRequired, isValidEmail } from "../../utils/validate";

export default function Contactus() {
  const { slug } = useStoreSlug();

  const [page, setPage] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [sent, setSent] = useState(false);

  const [sending, setSending] = useState(false);

  const [submitError, setSubmitError] =
    useState("");


  useEffect(() => {
    setLoading(true);

    setError("");

    client
      .get(`/store/${slug}/pages`)
      .then(({ data }) => {
        setPage(data);
      })
      .catch((err) => {
        console.error(
          "Contact page error:",
          err
        );

        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load contact page"
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);


  const update = (key) => (e) => {
    setForm((f) => ({
      ...f,
      [key]: e.target.value,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();

    setSubmitError("");

    setSent(false);

    const validationError = firstError([
      [!isRequired(form.name), "Please enter your name."],
      [!isRequired(form.email), "Please enter your email address."],
      [isRequired(form.email) && !isValidEmail(form.email), "Please enter a valid email address."],
      [!isRequired(form.message), "Please enter a message."],
      [isRequired(form.message) && form.message.trim().length < 10, "Your message needs to be at least 10 characters."],
    ]);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    try {
      setSending(true);

      const { data } =
        await client.post(
          `/store/${slug}/contact`,
          {
            name: form.name,
            email: form.email,
            message: form.message,
          }
        );

      console.log(
        "Contact API response:",
        data
      );

     
      if (data.success) {
        setSent(true);

        setForm({
          name: "",
          email: "",
          message: "",
        });
      }
    } catch (err) {
      console.error(
        "Contact submit error:",
        err
      );

      setSubmitError(
        err.response?.data?.message ||
          "Failed to send message. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Loading label="Loading…" />
    );
  }

  return (
    <div className="info-page">
      <ErrorBox message={error} />

      {page && (
        <div className="info-page-inner contact-page-inner">


          <div className="contact-page-info">

            <h1>
              {page.contact_heading ||
                "Contact us"}
            </h1>

            <p className="info-page-body">
              {page.contact_intro}
            </p>

            <div className="contact-details">


              {page.contact_email && (
                <div className="contact-detail-row">

                  <span className="contact-detail-label">
                    Email
                  </span>

                  <a
                    href={`mailto:${page.contact_email}`}
                  >
                    {page.contact_email}
                  </a>

                </div>
              )}



              {page.contact_phone && (
                <div className="contact-detail-row">

                  <span className="contact-detail-label">
                    Phone
                  </span>

                  <a
                    href={`tel:${page.contact_phone}`}
                  >
                    {page.contact_phone}
                  </a>

                </div>
              )}



              {page.contact_address && (
                <div className="contact-detail-row">

                  <span className="contact-detail-label">
                    Address
                  </span>

                  <span>
                    {page.contact_address}
                  </span>

                </div>
              )}

            </div>
          </div>


          <form
            className="panel contact-form"
            onSubmit={submit}
          >

            <h2>
              Send a message
            </h2>

            {sent && (
              <p className="success-box">
                Thanks — your message has
                been sent. We'll get back
                to you soon.
              </p>
            )}

            {submitError && (
              <p className="error-box">
                {submitError}
              </p>
            )}

            {!sent && (
              <>
               
                <input
                  className="input"
                  placeholder="Your name"
                  value={form.name}
                  onChange={update("name")}
                  required
                />

                <input
                  className="input"
                  type="email"
                  placeholder="Your email"
                  value={form.email}
                  onChange={update("email")}
                  required
                />

                <textarea
                  className="input"
                  rows={5}
                  placeholder="How can we help?"
                  value={form.message}
                  onChange={update("message")}
                  required
                />

                <button
                  className="btn btn-primary btn-block"
                  type="submit"
                  disabled={sending}
                >
                  {sending
                    ? "Sending..."
                    : "Send message"}
                </button>
              </>
            )}

          </form>
        </div>
      )}
    </div>
  );
}