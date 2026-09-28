import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../lib/api-error";
import { userService } from "../services/user.service";
import type { CreateUserPayload } from "../types/create-user.type";
import type { UserWithRelationResponse } from "../types/user.type";
import { Role } from "../user-role-enum";

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation<UserWithRelationResponse, Error, CreateUserPayload>({
    mutationFn: (userData) => userService.create(userData),

    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      if (variables.division !== undefined) {
        await queryClient.invalidateQueries({
          queryKey: ["divisions"],
        });
      }

      if (variables.role_id && Number(variables.role_id) === Role.Admin) {
        await queryClient.invalidateQueries({
          queryKey: ["user-management-permissions"],
        });
      }

      toast.success("User created successfully.", {
        id: "create-user-success",
      });
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to create user."), {
        id: "create-user-error",
      });
    },
  });
}
