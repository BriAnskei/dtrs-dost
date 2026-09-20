import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../lib/api-error";
import { userService } from "../service/user.service";
import type { CreateUserPayload } from "../type/creater-user.type";
import type { UserWithRelationResponse } from "../type/user.type";

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation<UserWithRelationResponse, Error, CreateUserPayload>({
    mutationFn: (userData) => userService.create(userData),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to create user."), {
        id: "create-user-error",
      });
    },
  });
}
