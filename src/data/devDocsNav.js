export const DOCS_PATH = "/developer/docs";
export const DOCS_ACTIVE_EVENT = "devdocs:active"; // the page tells the sidebar which section is on screen

export const DOCS_NAV = [
  {
    group: "Getting started",
    items: [
      ["introduction", "Introduction"],
      ["quickstart", "Quickstart"],
      ["requests", "Requests & headers"],
    ],
  },
  {
    group: "Core concepts",
    items: [
      ["authentication", "Authentication"],
      ["errors", "Errors"],
      ["error-handling", "Handling errors"],
      ["timeouts-retries", "Timeouts & retries"],
      ["idempotency", "Idempotency"],
      ["versioning", "Versioning"],
    ],
  },
  {
    group: "Endpoints you build",
    items: [
      ["ep-token_generation", "Login"],
      ["ep-create_warehouse", "Create warehouse"],
      ["ep-get_rating", "Get rates"],
      ["ep-order_create", "Create shipment"],
      ["ep-set_webhook", "Set webhook URL"],
    ],
  },
  {
    group: "Webhooks",
    items: [
      ["tracking-webhook", "Tracking webhook"],
      ["status-labels", "Status labels"],
      ["webhook-responses", "Webhook responses"],
    ],
  },
  {
    group: "Go live",
    items: [
      ["testing", "Testing locally"],
      ["review", "Review & approval"],
      ["troubleshooting", "Troubleshooting"],
      ["changelog", "Changelog"],
    ],
  },
];
