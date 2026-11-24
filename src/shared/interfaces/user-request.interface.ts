import { Request } from "@nestjs/common";
import { AuthUserDto } from "@/modules/auth/dto";

export interface RequestWithUser extends Request {
  user: AuthUserDto;
}