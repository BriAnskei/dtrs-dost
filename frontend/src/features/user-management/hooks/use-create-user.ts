import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateUserPayload, UserWithRelationResponse } from "../type/user.type";
import { userService } from "../user.service";

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation<UserWithRelationResponse, Error, CreateUserPayload>({
    mutationFn: (userData) => userService.create(userData),

    onSuccess: (createdUser) => {
      queryClient.setQueryData<UserWithRelationResponse[]>(["users"], (oldUsers) => {
        if (!oldUsers) return [createdUser];

        return [...oldUsers, createdUser];
      });
    },
  });
}
