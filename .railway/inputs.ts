// Template-editor defaults are not live credentials. IaC preserves operator
// values; it must never regenerate passwords or keys when planning an upgrade.
export const templateInputs = {
  OPENTAG_BOOTSTRAP_PAIRING_TOKEN: {
    description: "Local Runner pairing authority. Keep private; retrieve for the first pairing.",
    defaultValue: '${{secret(64, "abcdef0123456789")}}',
  },
  OPENTAG_RECOVERY_PAIRING_TOKEN: {
    description: "Independent recovery authority. Back up privately; do not reuse the pairing token.",
    defaultValue: '${{secret(64, "abcdef0123456789")}}',
  },
  OPENTAG_FENCING_TOKEN_SECRET: {
    description: "Internal fencing secret. Retain across restarts and upgrades.",
    defaultValue: '${{secret(64, "abcdef0123456789")}}',
  },
  OPENTAG_LOGIN_THROTTLE_SECRET: {
    description: "Independent login-throttle secret. Retain across restarts and upgrades.",
    defaultValue: '${{secret(64, "abcdef0123456789")}}',
  },
  OPENTAG_CONTAINER_RELAY_CONTENT_KEK: {
    description: "32-byte content-encryption key in hex. Back up with PostgreSQL; never regenerate on upgrade.",
    defaultValue: '${{secret(64, "abcdef0123456789")}}',
  },
  OPENTAG_CONTAINER_SLACK_SIGNING_SECRET: {
    description: "Signing secret from your own Slack App. Enter only in Railway protected variables.",
  },
  OPENTAG_CONTAINER_SLACK_BOT_TOKEN: {
    description: "Bot token from your own Slack App installation. Never share it with template authors.",
  },
  OPENTAG_BOOTSTRAP_ADMIN_EMAIL: { description: "Email for the initial Console owner." },
  OPENTAG_BOOTSTRAP_ADMIN_PASSWORD: {
    description: "Initial Console owner password. Bootstrap does not reset an existing password.",
    defaultValue: '${{secret(48, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")}}',
  },
  OPENTAG_SLACK_ROUTE_IDENTITY: {
    description: "Stable Slack callback route identity. Use it in both Slack callback URLs.",
    defaultValue: '${{secret(48, "abcdef0123456789")}}',
  },
  OPENTAG_SLACK_TEAM_ID: { description: "Slack workspace ID for the installation." },
  OPENTAG_SLACK_APP_ID: { description: "Slack App ID." },
  OPENTAG_SLACK_CHANNEL_ID: { description: "Private Slack channel ID where this teammate works." },
  OPENTAG_SLACK_BOT_USER_ID: { description: "The installed Slack bot's user ID." },
  OPENTAG_SLACK_MEMBER_USER_IDS: { description: "Allowed Slack user IDs, comma-separated, including the approver." },
  OPENTAG_SLACK_APPROVER_USER_ID: { description: "One allowed Slack user who can approve Draft PR effects." },
} as const;
