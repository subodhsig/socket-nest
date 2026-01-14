import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsStrongPassword,
  Matches,
  MinLength,
} from 'class-validator';

export class CreatePasswordDto {
  @ApiPropertyOptional({
    description: 'Temporary token for password reset',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  passwordResetToken?: string;

  @ApiPropertyOptional({ description: 'User password', nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @IsStrongPassword()
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'password too weak',
  })
  password?: string;
}
