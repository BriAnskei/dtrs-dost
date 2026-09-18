import cryptoRandomString from "crypto-random-string";

const words = ["Mango", "River", "Cloud", "Paper", "Forest"];

export function passwordGenerator(fullName: string): string {
  const firstName = fullName.trim().split(/\s+/)[0];

  const randomWord = words[Math.floor(Math.random() * words.length)];

  const timestamp = Date.now();

  const randomValue = cryptoRandomString({
    length: 3,
    type: "numeric",
  });

  const timestampValue = String(timestamp).slice(-3);

  const sixDigitValue = `${timestampValue}${randomValue}`;

  return `${firstName}@Dtrs.${randomWord}${sixDigitValue}`;
}
