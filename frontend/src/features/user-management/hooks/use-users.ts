import { useQuery } from "@tanstack/react-query";
import { userService } from "../service/user.service";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => userService.findAll(),
  });
}
