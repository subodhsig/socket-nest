import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';
import { Paginated } from 'src/common/pagination/interface/paginated.interface';
import { PaginationProvider } from 'src/common/pagination/service/pagination.provider';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

import { UserStatusChangeDto } from './dto/user.status-change.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,

    private readonly pagination: PaginationProvider,
  ) {}
  //create user
  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }
  //find by email for password reset
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: ['user_id', 'email', 'password', 'user_role', 'isActive'],
    });
  }
  //fund all users
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  //update user

  async update(userId: string, updateData: Partial<User>): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    Object.assign(user, updateData); // merge new data
    return this.userRepository.save(user);
  }
  //find for password reset token
  async findByPasswordResetToken(token: string) {
    return this.userRepository.findOne({
      where: { passwordResetToken: token, isActive: false },
    });
  }

  async findForPasswordResetToken(token: string) {
    return this.userRepository.findOne({
      where: { passwordResetToken: token },
    });
  }

  //find by number
  async findByNumber(phone: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { phone } });
  }
  //find by id

  async findById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
    });
    // console.log(user);

    if (!user) {
      throw new NotFoundException(`User with id not found`);
    }

    return user;
  }

  //delete user
  async remove(id: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { user_id: id } });

    if (!user) {
      throw new NotFoundException(`User not found`);
    }
    await this.userRepository.softDelete(user.user_id);
    return { message: `User Deleted successfully` };
  }

  //pagination on user
  async findPaginated(dto: PaginationQueryDto): Promise<Paginated<User>> {
    return this.pagination.paginate<User>(dto, {
      repository: this.userRepository,
      search: {
        columns: ['first_name', 'last_name', 'email', 'phone'],
        term: dto.q,
      },
      maxLimit: 100,
    });
  }

  async findByEmailWithDeleted(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .withDeleted()
      .where('user.email = :email', { email })
      .select([
        'user.user_id',
        'user.email',
        'user.user_role',
        'user.isActive',
        'user.deletedAt',
      ])
      .getOne();
  }

  async restore(userId: string): Promise<void> {
    await this.userRepository.restore(userId);
  }
  async allUserNotDeletedAndDeleted() {
    return this.userRepository
      .createQueryBuilder('user')
      .withDeleted()
      .getMany();
  }

  async changeStatus(userStatuschangedto: UserStatusChangeDto): Promise<User> {
    const { userId, isActive } = userStatuschangedto;
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
    });
    if (!user) throw new NotFoundException('User not found');
    user.isActive = isActive;
    return this.userRepository.save(user);
  }
}
