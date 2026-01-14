import {
  Body,
  Controller,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from 'src/common/enums/user.role.enum';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { User } from 'src/user/entities/user.entity';
import { AuthService } from './auth.service';
import { GetUser } from './decorators/getuser.decorator';
import { Roles } from './decorators/roles.decorators';
import { LoginDto } from './dto/login-dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { CreatePasswordDto } from './dto/create-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { RestoreUserDto } from './dto/restore.user.dto';
import { UserStatusChangeDto } from 'src/user/dto/user.status-change.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-user')
  @ApiOperation({ summary: 'Register a new user by Admin' })
  @UseInterceptors(FileInterceptor('profileImage'))
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        first_name: { type: 'string', example: 'John' },
        last_name: { type: 'string', example: 'Doe' },
        email: { type: 'string', example: 'user@example.com' },
        phone: { type: 'string', example: '+9779812345678' },
        designation: { type: 'string', example: 'Manager' },
        department_name: { type: 'string', example: 'IT' },
        user_role: { type: 'string', enum: Object.values(Role) },
        profileImage: { type: 'string', format: 'binary' },
      },
    },
  })
  async registerUser(
    @GetUser() admin: User,
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.authService.registerUserByAdmin(admin, createUserDto, file);
  }

  @Post('create-password')
  @ApiOperation({ summary: 'Create password for the first time' })
  async createPassword(@Body() createpassworddto: CreatePasswordDto) {
    return this.authService.createPassword(createpassworddto);
  }

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  async logout(@Req() req) {
    const userId = req.user.user_id; // Extract user ID from JWT payload
    return this.authService.logout(userId);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Forgot password' })
  async forgotPassword(@Body() forgetpassworddto: ForgetPasswordDto) {
    return this.authService.forgotPassword(forgetpassworddto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password' })
  async resetPassword(@Body() resetpassworddto: ResetPasswordDto) {
    const { passwordResetToken, newPassword } = resetpassworddto as any;
    return this.authService.resetPassword(passwordResetToken, newPassword);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change password' })
  async chagePassword(@Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(changePasswordDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiProperty({ example: { email: 'hello@gmail.com' } })
  @Post('restore-user')
  @ApiOperation({ summary: 'Restore a soft-deleted user (Admin only)' })
  async restoreUser(@Body() restoreUserDto: RestoreUserDto) {
    return this.authService.restoreUser(restoreUserDto.email);
  }

  //todo: change user status active/inactive for any future use already it is ready

  // @Patch('admin/change/user-status')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.ADMIN)
  // @ApiBearerAuth()
  // async changeUserStatus(@Body() userStatusChangedto: UserStatusChangeDto) {
  //   return this.authService.changeUserStatus(userStatusChangedto);
  // }
}
