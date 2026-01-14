import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorators';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from 'src/common/enums/user.role.enum';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';
import { Paginated } from 'src/common/pagination/interface/paginated.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Get('admin/users')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  findAll() {
    return this.userService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user details' })
  async update(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 400 })) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // Convert profileImage to string if it's a File
    const updateData: any = { ...updateUserDto };
    return this.userService.update(id, updateData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Delete('admin/:id')
  @ApiOperation({ summary: 'Delete a user (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Get('admin/paginated')
  @ApiOperation({ summary: 'Get paginated list of users (Admin only)' })
  findPaginated(@Query() dto: PaginationQueryDto): Promise<Paginated<User>> {
    return this.userService.findPaginated(dto);
  }

  @Get('worked-with/:id')
  @ApiOperation({
    summary: 'Get users who have worked with the specified user',
  })
  async getUsersWorkedWith(@Param('id') id: string): Promise<User[]> {
    return this.userService.getWorkedWithMembers(id);
  }

  @Get('list/all-with-deleted')
  @ApiOperation({ summary: 'Get all users including deleted ones' })
  async allUserNotDeletedAndDeleted(): Promise<User[]> {
    return this.userService.allUserNotDeletedAndDeleted();
  }
}
