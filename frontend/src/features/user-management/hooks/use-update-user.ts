import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "../service/user.service";
import type { CreateUserPayload } from "../type/creater-user.type";
import type { UserWithRelationResponse } from "../type/user.type";

export type UpdateUserPayload = Partial<Omit<CreateUserPayload, "password">> & {
  password?: string; // omit/empty to leave password unchanged
};

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation<
    UserWithRelationResponse,
    Error,
    { id: string; data: UpdateUserPayload }
  >({
    mutationFn: ({ id, data }) => userService.update(id, data),

    onSuccess: (updatedUser) => {
      queryClient.setQueryData<UserWithRelationResponse[]>(["users"], (oldUsers) => {
        if (!oldUsers) return [updatedUser];
        return oldUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      });
    },
  });
}
