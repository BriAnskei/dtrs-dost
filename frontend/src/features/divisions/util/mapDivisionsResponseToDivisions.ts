import type { Division, DivisionResponse, DivisionUser } from "../type/division.type";

function mapUser(u: DivisionResponse["users"][number]): DivisionUser {
  return {
    id: u.id,
    fullName: u.full_name,
    position: u.position,
    email: u.email,
    role: u.role?.role_name ?? "—",
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
