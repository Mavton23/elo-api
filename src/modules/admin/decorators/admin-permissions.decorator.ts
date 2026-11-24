import { SetMetadata } from '@nestjs/common';
import { AdminModule, AdminAction } from '@prisma/client';

export const AdminPermissions = (permissions: [AdminModule, AdminAction]) => 
  SetMetadata('admin-permissions', permissions);