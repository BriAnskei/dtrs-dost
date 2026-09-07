/** Utility helpers used across DocumentUploadPage */
export const generateIdCode = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const dd = String(now.getDate()).padStart(2, "0");
  const seq = Math.floor(1 + Math.random() * 999);
  return `${yyyy}-${dd}-${seq}`;
};

export const nowDateTimeLocal = () => new Date().toISOString().slice(0, 16);
