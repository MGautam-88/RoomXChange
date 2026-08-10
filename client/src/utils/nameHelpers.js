/**
 * Formats a user's full name to display only the first and last word.
 * E.g., "Gautam Om Parkash Malhotra" -> "Gautam Malhotra"
 * "Aarav Kumar" -> "Aarav Kumar"
 */
export const formatDisplayName = (name) => {
	if (!name || typeof name !== "string") return "User";
	const words = name.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return "User";
	if (words.length <= 2) return words.join(" ");
	return `${words[0]} ${words[words.length - 1]}`;
};

/**
 * Returns 2-letter initials from the first and last words of a user's name.
 * E.g., "Gautam Om Parkash Malhotra" -> "GM"
 */
export const getUserInitials = (name) => {
	if (!name || typeof name !== "string") return "U";
	const words = name.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return "U";
	if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
	return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};
