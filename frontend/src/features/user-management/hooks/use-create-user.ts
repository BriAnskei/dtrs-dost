import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../lib/api-error"; // adjust path
import { userService } from "../service/user.service";
import type { CreateUserPayload } from "../type/creater-user.type";
import type { UserWithRelationResponse } from "../type/user.type";

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

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to create user."), {
        id: "create-user-error",
      });
    },
  });
}
