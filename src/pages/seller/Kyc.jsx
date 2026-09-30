import { useEffect, useState } from "react";
import { getKycStatus, submitKyc, uploadKycDoc } from "../../api/client";
import { Loading, ErrorBox, SuccessBox } from "../../components/Ui";
import SingleImageUploader from "../../components/SingleImageUploader";
import { useConfirm } from "../../context/ConfirmContext";
import { useAuth } from "../../context/AuthContext";
import { isRequired } from "../../utils/validate";

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const STATUS_COPY = {
  not_submitted: { label: "Not submitted", tone: "muted" },
  pending: { label: "Under review", tone: "warn" },
  approved: { label: "Verified", tone: "ok" },
  rejected: { label: "Rejected — please resubmit", tone: "danger" },
};

const emptyForm = {
  full_name: "",
  pan_number: "",
  aadhaar_number: "",
  pan_doc_url: "",
  aadhaar_front_url: "",
  aadhaar_back_url: "",
  bank_proof_url: "",
};

export default function Kyc() {
  const [kyc, setKyc] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState(false);
  const confirmAction = useConfirm();
  const { seller, refreshSeller } = useAuth();

  const load = () => {
    setLoading(true);
    getKycStatus()
      .then(({ data }) => {
        setKyc(data.kyc);
   
        if (data.kyc?.status && seller?.kyc?.status !== data.kyc.status) refreshSeller().catch(() => {});
        if (data.kyc && data.kyc.status !== "not_submitted") {
          setForm({
            full_name: data.kyc.full_name || "",
            pan_number: data.kyc.pan_number || "",
            aadhaar_number: data.kyc.aadhaar_number || "",
            pan_doc_url: data.kyc.pan_doc_url || "",
            aadhaar_front_url: data.kyc.aadhaar_front_url || "",
            aadhaar_back_url: data.kyc.aadhaar_back_url || "",
            bank_proof_url: data.kyc.bank_proof_url || "",
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isRequired(form.full_name)) {
      setError("Please enter your full name.");
      return;
    }
    if (!isRequired(form.pan_number) || !PAN_RE.test(form.pan_number.toUpperCase())) {
      setError("Please enter a valid PAN number (e.g. ABCDE1234F).");
      return;
    }
    if (!isRequired(form.aadhaar_number) || !/^\d{12}$/.test(form.aadhaar_number)) {
      setError("Aadhaar number should be exactly 12 digits.");
      return;
    }
    if (!form.pan_doc_url) {
      setError("Please upload your PAN document.");
      return;
    }
    if (!form.aadhaar_front_url) {
      setError("Please upload the front of your Aadhaar card.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await submitKyc(form);
      setKyc(data.kyc);
      setEditing(false);
      refreshSeller().catch(() => {});
      setSuccess(
        kyc?.status === "approved"
          ? "Your updated details have been submitted for review. Until they're re-approved, this KYC page is the only part of your dashboard you can use."
          : "KYC submitted — we'll review it shortly."
      );
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const status = STATUS_COPY[kyc?.status || "not_submitted"];
  const locked = kyc?.status === "pending" || (kyc?.status === "approved" && !editing);

  const handleRequestEdit = async () => {
    const ok = await confirmAction({
      title: "Update your verified KYC details?",
      message:
        "Editing and resubmitting will send your details back for review. Until it's re-approved, this KYC page is the only part of your dashboard you can use. Only do this if something genuinely needs to change (renewed document, name change, a correction).",
      confirmText: "Continue and edit",
      danger: true,
    });
    if (ok) setEditing(true);
  };

  return (
    <div>
      <div className="page-header">
        <h1>KYC verification</h1>
        <span className={`badge badge-${status.tone}`}>{status.label}</span>
      </div>

      <p className="muted">
        We need your PAN, Aadhaar and a bank proof to keep your account compliant and enable payouts.
        This is separate from your Razorpay payment account setup under Wallet → Payment settings.
      </p>

      <ErrorBox message={error} />
      <SuccessBox message={success} />

      {kyc?.status === "rejected" && kyc.rejection_reason && (
        <div className="alert alert-danger">Reason: {kyc.rejection_reason}</div>
      )}

      <form className="card" onSubmit={handleSubmit}>
        <label>
          Full legal name
          <input
            className="input"
            required
            disabled={locked}
            placeholder="As printed on your PAN card"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <span className="muted small">Enter your name exactly as it appears on your PAN card — mismatches are a common reason for rejection.</span>
        </label>

        <label>
          PAN number
          <input
            className="input"
            required
            disabled={locked}
            placeholder="ABCDE1234F"
            maxLength={10}
            value={form.pan_number}
            onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase() })}
          />
        </label>

        <label>
          Aadhaar number
          <input
            className="input"
            required
            disabled={locked}
            placeholder="12 digit number"
            maxLength={12}
            value={form.aadhaar_number}
            onChange={(e) => setForm({ ...form, aadhaar_number: e.target.value.replace(/\D/g, "") })}
          />
        </label>

        <div className="form-grid">
          <div>
            <p>PAN card photo *</p>
            <SingleImageUploader
              value={form.pan_doc_url}
              onChange={(url) => setForm({ ...form, pan_doc_url: url })}
              uploadFn={uploadKycDoc}
              disabled={locked}
            />
          </div>
          <div>
            <p>Aadhaar — front *</p>
            <SingleImageUploader
              value={form.aadhaar_front_url}
              onChange={(url) => setForm({ ...form, aadhaar_front_url: url })}
              uploadFn={uploadKycDoc}
              disabled={locked}
            />
          </div>
          <div>
            <p>Aadhaar — back</p>
            <SingleImageUploader
              value={form.aadhaar_back_url}
              onChange={(url) => setForm({ ...form, aadhaar_back_url: url })}
              uploadFn={uploadKycDoc}
              disabled={locked}
            />
          </div>
          <div>
            <p>Bank proof (cancelled cheque / passbook)</p>
            <SingleImageUploader
              value={form.bank_proof_url}
              onChange={(url) => setForm({ ...form, bank_proof_url: url })}
              uploadFn={uploadKycDoc}
              disabled={locked}
            />
          </div>
        </div>

        {!locked && (
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Submitting…" : kyc?.status === "rejected" || editing ? "Resubmit KYC" : "Submit KYC"}
          </button>
        )}
        {editing && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginLeft: 10 }}
            onClick={() => {
              setEditing(false);
              load();
            }}
          >
            Cancel
          </button>
        )}
        {locked && kyc?.status === "pending" && (
          <p className="muted small">Your submission is locked while it's {status.label.toLowerCase()}.</p>
        )}
        {locked && kyc?.status === "approved" && (
          <div>
            <p className="muted small" style={{ marginBottom: 8 }}>
              Your KYC is verified. Need to change something (renewed document, name change, a correction)?
            </p>
            <button type="button" className="btn btn-ghost" onClick={handleRequestEdit}>
              Update KYC details
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
