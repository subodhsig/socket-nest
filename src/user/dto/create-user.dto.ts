import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsLowercase,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from 'src/common/enums/user.role.enum';

export class CreateUserDto {
  @ApiProperty({
    description: 'First name of the user',
    minLength: 3,
    maxLength: 16,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(16)
  first_name: string;

  @ApiProperty({
    description: 'Last name of the user',
    minLength: 3,
    maxLength: 16,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(16)
  last_name: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Unique email of the user',
  })
  @IsEmail()
  @IsNotEmpty()
  @IsLowercase()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: '+9779812345678',
    description:
      'Full phone number including country code (e.g. +9779812345678)',
  })
  @IsNotEmpty()
  @Matches(/^\+\d{7,15}$/, {
    message:
      'Phone number must include country code and be 7 to 15 digits long (e.g. +9779812345678)',
  })
  phone: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Profile image file upload',
  })
  // @ApiProperty({
  //   type: 'string',
  //   format: 'binary',
  //   description: 'Profile image of the user',
  // })
  // profileImage: Express.Multer.File;
  @ApiProperty({ example: 'Associate', description: 'Designation of the user' })
  @IsString()
  @IsNotEmpty()
  designation: string;

  @ApiPropertyOptional({
    example: 'IT Department',
    description: 'Department of the user',
  })
  @IsOptional()
  @IsString()
  department_name?: string;

  @ApiPropertyOptional({ description: 'Role of the user', enum: Role })
  @IsOptional()
  user_role?: Role;
}
