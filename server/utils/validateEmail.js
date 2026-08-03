const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || "").trim();

if (!ALLOWED_DOMAIN) {
  throw new Error("ALLOWED_EMAIL_DOMAIN is required.");
}

const escapedDomain = ALLOWED_DOMAIN.replace(/\./g, "\\.");

const collegeEmailRegex = new RegExp(
  `^\\d{2}b[a-z]{2}\\d{3}@${escapedDomain}$`,
  "i"
);

export const isValidCollegeEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  return collegeEmailRegex.test(email.trim());
};

export const getAllowedDomain = () => ALLOWED_DOMAIN;

export const normalizeRollNumberOrEmail = (input = "") => {
  const clean = input.trim().toLowerCase();
  if (!clean) return "";
  if (clean.includes("@")) return clean;
  return `${clean}@${ALLOWED_DOMAIN}`;
};