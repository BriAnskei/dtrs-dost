import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UpdateVariables } from "../../../../../../backend/src/common/update-payloads/update-variables";
import { UserPermissionService } from "../../service/user-permission-service";
import type { GrantUserManagementPermissionDto } from "../../types/grant-user-permission-dto";

export function useSetUserManagementPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateVariables<GrantUserManagementPermissionDto>) =>
      UserPermissionService.setUserManagementPermission(id, data),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["user-management-permissions"],
      });

      toast.success("Permission updated successfully", {
        id: "update-user-success",
      });
    },
    onError: () => {
      toast.error("Couldn't update permissions. Please try again.", {
        id: "set-user-management-permission-error",
      });
    },
  });
}
