// Shaped exactly like GET /divisions (joined with users + role) should

import type { DivisionResponse } from "../type/division.type";

// return, so swapping this out for the real API later is a one-line change.
export const MOCK_DIVISIONS: DivisionResponse[] = [
  {
    id: "d1",
    division_name: "Civil Works Division",
    users: [
      {
        id: "u1",
        full_name: "Maria Santos",
        position: "Division Head",
        email: "maria.santos@peo.gov.ph",
        is_active: true,
        role: { role_name: "Admin" },
      },
      {
        id: "u2",
        full_name: "Jose Reyes",
        position: "Civil Engineer II",
        email: "jose.reyes@peo.gov.ph",
        is_active: true,
        role: { role_name: "Staff" },
      },
      {
        id: "u3",
        full_name: "Anna Bautista",
        position: "Civil Engineer I",
        email: "anna.bautista@peo.gov.ph",
        is_active: true,
        role: { role_name: "Staff" },
      },
      {
        id: "u4",
        full_name: "Carlo Dizon",
        position: "Draftsman",
        email: "carlo.dizon@peo.gov.ph",
        is_active: false,
        role: { role_name: "Staff" },
      },
      {
        id: "u5",
        full_name: "Liza Fernandez",
        position: "Engineering Aide",
        email: "liza.fernandez@peo.gov.ph",
        is_active: true,
        role: { role_name: "Staff" },
      },
      {
        id: "u6",
        full_name: "Ramon Cruz",
        position: "Civil Engineer II",
        email: "ramon.cruz@peo.gov.ph",
        is_active: true,
        role: { role_name: "Staff" },
      },
      {
        id: "u7",
        full_name: "Ella Manalo",
        position: "Civil Engineer I",
        email: "ella.manalo@peo.gov.ph",
        is_active: true,
        role: { role_name: "Staff" },
      },
    ],
  },
  {
    id: "d2",
    division_name: "Maintenance Division",
    users: [
      {
        id: "u8",
        full_name: "Pedro Villanueva",
        position: "Division Head",
        email: "pedro.villanueva@peo.gov.ph",
        is_active: true,
        role: { role_name: "Admin" },
      },
      {
        id: "u9",
        full_name: "Grace Lim",
        position: "Maintenance Engineer",
        email: "grace.lim@peo.gov.ph",
        is_active: true,
        role: { role_name: "Staff" },
      },
      {
        id: "u10",
        full_name: "Miguel Torres",
        position: "Foreman",
        email: "miguel.torres@peo.gov.ph",
        is_active: true,
        role: { role_name: "Staff" },
      },
    ],
  },
  {
    id: "d3",
    division_name: "Planning and Design Division",
    users: [
      {
        id: "u11",
        full_name: "Sofia Ramos",
        position: "Planning Officer",
        email: "sofia.ramos@peo.gov.ph",
        is_active: true,
        role: { role_name: "Super Admin" },
      },
      {
        id: "u12",
        full_name: "Diego Aquino",
        position: "Architect",
        email: "diego.aquino@peo.gov.ph",
        is_active: true,
        role: { role_name: "Staff" },
      },
    ],
  },
  {
    id: "d4",
    division_name: "Equipment Division",
    users: [],
  },
  {
    id: "d5",
    division_name: "Administrative Division",
    users: [
      {
        id: "u13",
        full_name: "Brian Ebrahim Gierza",
        position: "Admin Assistant",
        email: "katrina.uy@peo.gov.ph",
        is_active: true,
        role: { role_name: "Receiver" },
      },
    ],
  },
];
