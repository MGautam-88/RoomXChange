export const deriveBlockAndFloor = (roomCode = "") => {
  const clean = roomCode.trim().toUpperCase();
  if (!clean || clean.length < 4) {
    return { block: "A", floor: "Ground floor (1xx)" };
  }

  const blockLetter = clean[0];
  const block = blockLetter;

  const digit = clean[1];
  let floor = "Ground floor (1xx)";
  if (digit === "1") {
    floor = "Ground floor (1xx)";
  } else if (digit === "2") {
    floor = "First floor (2xx)";
  } else if (digit === "3") {
    floor = "Second floor (3xx)";
  } else if (digit === "4") {
    floor = "Top floor (4xx)";
  }

  return { block, floor };
};
