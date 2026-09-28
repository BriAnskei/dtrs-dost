import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPermissionService } from "../../service/user-permission-service";

export function useRevokeUserManagementPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => UserPermissionService.revokeUserManagementPermission(id),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["user-management-permissions"],
      });

      toast.success("Permission revoked successfully", {
        id: "revoke-user-success",
      });
    },

    onError: () => {
      toast.error("Couldn't revoke access. Please try again.", {
        id: "revoke-user-management-permission-error",
      });
    },
  });
}
