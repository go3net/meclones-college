export const CATEGORY_LABEL: Record<string, string> = {
  FIGHTING: "Fighting",
  BULLYING: "Bullying",
  ABSENTEEISM: "Absenteeism",
  LATENESS: "Lateness",
  UNIFORM: "Uniform violation",
  ACADEMIC_DISHONESTY: "Academic dishonesty",
  PROPERTY_DAMAGE: "Property damage",
  INSUBORDINATION: "Insubordination",
  PHONE_MISUSE: "Phone misuse",
  BAD_LANGUAGE: "Bad language",
  OTHER: "Other",
};

export const SEVERITY_LABEL: Record<string, string> = {
  MINOR: "Minor",
  MODERATE: "Moderate",
  MAJOR: "Major",
  SEVERE: "Severe",
};

export const SEVERITY_TONE: Record<string, "neutral" | "info" | "warning" | "danger"> = {
  MINOR: "neutral",
  MODERATE: "info",
  MAJOR: "warning",
  SEVERE: "danger",
};

export const SANCTION_LABEL: Record<string, string> = {
  NONE: "No sanction",
  WARNING: "Warning",
  DETENTION: "Detention",
  PARENT_MEETING: "Parent meeting",
  WRITTEN_APOLOGY: "Written apology",
  COMMUNITY_SERVICE: "Community service",
  COUNSELING: "Counselling",
  SUSPENSION_1_DAY: "Suspension — 1 day",
  SUSPENSION_3_DAYS: "Suspension — 3 days",
  SUSPENSION_1_WEEK: "Suspension — 1 week",
  EXPULSION: "Expulsion",
  OTHER: "Other",
};

export const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  AWAITING_ACK: "Awaiting parent ack",
  RESOLVED: "Resolved",
  APPEALED: "Appealed",
  ESCALATED: "Escalated",
};

export const STATUS_TONE: Record<string, "neutral" | "info" | "warning" | "danger" | "success"> = {
  OPEN: "warning",
  AWAITING_ACK: "info",
  RESOLVED: "success",
  APPEALED: "warning",
  ESCALATED: "danger",
};
