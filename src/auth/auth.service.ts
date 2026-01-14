import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import dotenv from 'dotenv';
import { Role } from 'src/common/enums/user.role.enum';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreatePasswordDto } from './dto/create-password.dto';
import { LoginDto } from './dto/login-dto';
import { UserStatusChangeDto } from 'src/user/dto/user.status-change.dto';

dotenv.config();
const FRONTEND_URL = process.env.FRONTEND_URL;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async registerUserByAdmin(
    admin: User,
    createUserDto: CreateUserDto,
    profileImage: Express.Multer.File,
  ) {
    if (!profileImage)
      throw new BadRequestException('Profile picture is required');

    createUserDto.email = createUserDto.email.trim().toLowerCase();
    if (createUserDto.phone) createUserDto.phone = createUserDto.phone.trim();

    // Run DB checks concurrently → O(1) latency instead of sequential waits
    const [existing, existingNumber, deletedUser] = await Promise.all([
      this.userService.findByEmail(createUserDto.email),
      this.userService.findByNumber(createUserDto.phone),
      this.userService.findByEmailWithDeleted(createUserDto.email),
    ]);

    if (existing) throw new BadRequestException('Email already registered');
    if (existingNumber)
      throw new BadRequestException('Phone number already registered');
    if (deletedUser)
      throw new BadRequestException(
        'Cannot invite a deleted user. Use a new email or restore the user.',
      );

    // Cloudinary upload (I/O) → can run in parallel with token generation
    const [uploadResult, tokenData] = await Promise.all([
      this.cloudinaryService.uploadFile(profileImage, {
        folder: 'profiles',
        resource_type: 'image',
      }),
      this.generateResetToken(1), // reusable util function
    ]);

    const { token, expires } = tokenData;
    const imageUrl = uploadResult.secure_url;

    const user = await this.userService.create({
      ...createUserDto,
      password: null,
      isActive: false,
      passwordResetToken: token,
      passwordResetExpires: expires,
      user_role: createUserDto.user_role || Role.USER,
      profileImage: imageUrl,
      created_by: admin,
    });

    await this.sendInviteEmail(user.email, token);

    return { message: 'User registered and invite email sent' };
  }

  // Extracted into its own algorithmic function
  private async generateResetToken(expiryHours: number) {
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    return { token, expires };
  }

  private async sendInviteEmail(email: string, token: string) {
    const url = `${FRONTEND_URL}auth/create-password?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'You are invited - Set your password',
      template: 'invite',
      context: { url },
    });
  }

  async createPassword(createPasswordDto: CreatePasswordDto) {
    const { passwordResetToken, password } = createPasswordDto;

    // Validate token exists
    if (!passwordResetToken) {
      throw new BadRequestException('Token is required');
    }

    // Find user by token
    const user =
      await this.userService.findByPasswordResetToken(passwordResetToken);
    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException('Token invalid or expired');
    }

    // Validate new password exists
    if (!password) {
      throw new BadRequestException('Password is required');
    }

    // Hash and update password
    user.password = await bcrypt.hash(password, 10);
    user.isActive = true;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    const updatedUser = await this.userService.update(user.user_id, user);

    return updatedUser;
  }

  async login(loginDto: LoginDto) {
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive)
      throw new ForbiddenException('Account not activated yet');
    const isMatch = await bcrypt.compare(
      loginDto.password,
      user.password || '',
    );
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      user_id: user.user_id,
      email: user.email,
      role: user.user_role,
      first_name: user.first_name,
      last_name: user.last_name,
    };

    // Sign token using JwtModule with the same secret
    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
      user: {
        ...payload,
        id: payload.user_id,
      },
    };
  }
  //reset password
  async resetPassword(token: string, newPassword: string) {
    const user = await this.userService.findForPasswordResetToken(token);
    // console.log(user);

    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException('Token invalid or expired');
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    // Update user in DB
    const updatedUser = await this.userService.update(user.user_id, user);

    // Exclude password from response
    return updatedUser;
  }

  //forgot password
  async forgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new BadRequestException('No user found with this email');

    const token = randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    user.passwordResetToken = token;
    user.passwordResetExpires = expires;
    await this.userService.update(user.user_id, user);

    // send email
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Password Reset',
      template: './reset-password',
      context: {
        url: `${FRONTEND_URL}auth/reset-password?token=${token}`,
      },
    });

    return { message: 'Password reset email sent' };
  }

  //change password
  async changePassword(changePasswordDto: ChangePasswordDto) {
    const user = await this.userService.findById(changePasswordDto.userId);
    // console.log(user);
    const isMatch = await bcrypt.compare(
      changePasswordDto.password,
      user.password || '',
    );
    if (!isMatch)
      throw new BadRequestException('Current password is incorrect');

    user.password = await bcrypt.hash(changePasswordDto.newPassword, 10);

    return this.userService.update(user.user_id, user);
  }

  //logout
  logout(userId: string) {
    // console.log(userId);
    return { message: 'User logged out successfully' };
  }

  //for restoring user
  async restoreUser(email: string) {
    const user = await this.userService.findByEmailWithDeleted(email);
    if (!user) throw new BadRequestException('No user found with this email');
    if (!user.deletedAt) throw new BadRequestException('User is not deleted');
    await this.userService.restore(user.user_id);
    return { message: 'User restored successfully' };
  }

  async changeUserStatus(
    userStatusChangedto: UserStatusChangeDto,
  ): Promise<User> {
    return this.userService.changeStatus(userStatusChangedto);
  }
}
