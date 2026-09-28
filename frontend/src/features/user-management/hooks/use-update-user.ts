import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UpdateVariables } from "../../../../../backend/src/common/update-payloads/update-variables";
import { getApiErrorMessage } from "../../../lib/api-error";
import { userService } from "../services/user.service";
import type { UpdateUserPayload } from "../types/update-user.type";
import { Role } from "../user-role-enum";

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateVariables<UpdateUserPayload>>({
    mutationFn: ({ id, data }) => userService.update(id, data),

    onSuccess: async (_, variables) => {
      console.log(variables);
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      if (variables.data.division !== undefined) {
        await queryClient.invalidateQueries({
          queryKey: ["divisions"],
        });
      }

      if (variables.data.role_id && Number(variables.data.role_id) === Role.Admin) {
        await queryClient.invalidateQueries({
          queryKey: ["user-management-permissions"],
        });
      }

      toast.success("User updated successfully.", {
        id: "update-user-success",
      });
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to update user."), {
        id: "update-user-error",
      });
    },
  });
}
