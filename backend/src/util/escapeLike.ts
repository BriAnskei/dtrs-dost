export const escapeLike = (value: string): string => {
  return value.replace(/[\\%_]/g, "\\$&");
};
