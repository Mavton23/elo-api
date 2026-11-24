import { PASSWORD_MESSAGE, PASSWORD_REGEX } from './password-policy';
import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  confirmNewPassword: string;
}