import type { Division, DivisionUser } from "../type/division.type";
import type { DivisionResponse, DivisionUserResponse } from "../type/division-api.type";

// API doesn't send position/role for division users — placeholder until it does.
function mapUser(u: DivisionUserResponse): DivisionUser {
  return {
    id: u.id,
    fullName: u.full_name,
    position: null,
    email: u.email,
    role: "—",
    isActive: u.is_active,
  };
}

export function mapDivisionsResponseToDivisions(raw: DivisionResponse[]): Division[] {
  return raw.map((d) => {
    const users = (d.users ?? []).map(mapUser);
    return {
      id: d.id,
      name: d.division_name,
      users,
      userCount: users.length,
    };
  });
}
