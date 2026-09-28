import { apiClient } from "../../../lib/api-client";
import type { PaginatedResponse } from "../../../type/paginated-response.type";
import type { GrantUserManagementPermissionDto } from "../types/grant-user-permission-dto";
import type {
  FindUserManagementPermissionsParams,
  UserManagementPermission,
} from "../types/user-management-permission-types";

export const UserPermissionService = {
  async findAllUserManagementPermission(
    params: FindUserManagementPermissionsParams,
  ): Promise<PaginatedResponse<UserManagementPermission>> {
    const { data } = await apiClient.get("/user-permissions/user-management", {
      params,
    });

    return data;
  },

  async setUserManagementPermission(
    userId: string,
    data: Partial<GrantUserManagementPermissionDto>,
  ): Promise<void> {
    await apiClient.put(`/user-permissions/user-management/${userId}`, data);
  },

  async revokeUserManagementPermission(userId: string): Promise<void> {
    await apiClient.delete(`/user-permissions/${userId}/user-management`);
  },
};
