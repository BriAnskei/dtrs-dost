import { Buffer } from "node:buffer";
import { registerDecorator, ValidationOptions } from "class-validator";

export function IsValidCursor(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: "isValidCursor",
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== "string" || value.length === 0) {
            return false;
          }

          try {
            const decoded = Buffer.from(value, "base64url").toString("utf8");

            // Require canonical Base64URL encoding.
            if (Buffer.from(decoded, "utf8").toString("base64url") !== value) {
              return false;
            }

            const cursor: unknown = JSON.parse(decoded);

            return (
              typeof cursor === "object" && cursor !== null && !Array.isArray(cursor)
            );
          } catch {
            return false;
          }
        },

        defaultMessage: () => "cursor must be a valid Base64URL-encoded JSON object",
      },
    });
  };
}
