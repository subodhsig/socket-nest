import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';
import { Paginated } from 'src/common/pagination/interface/paginated.interface';
import { PaginationProvider } from 'src/common/pagination/service/pagination.provider';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectMember } from 'src/projects/entities/project-member.entity';
import { UserStatusChangeDto } from './dto/user.status-change.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Project) private projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private projectMemberRepo: Repository<ProjectMember>,
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

  async getWorkedWithMembers(userId: string) {
    if (!userId) throw new NotFoundException('User ID is required');

    //  Get all project memberships for this user (including deleted projects)
    const userProjects = await this.projectMemberRepo
      .createQueryBuilder('pm')
      .withDeleted() // include soft-deleted memberships too
      .innerJoinAndSelect('pm.project', 'project')
      .where('pm.user_id = :userId', { userId })
      .getMany();

    //  Safely get all project IDs
    const projectIds = userProjects
      .map((pm) => pm.project?.project_id)
      .filter(Boolean);

    if (projectIds.length === 0) return [];

    // Get all other members from those projects (include deleted projects)
    const workedWithMembers = await this.projectMemberRepo
      .createQueryBuilder('pm')
      .withDeleted() // include deleted memberships
      .innerJoinAndSelect('pm.user', 'user')
      .innerJoinAndSelect('pm.project', 'project')
      .where('pm.project_id IN (:...projectIds)', { projectIds })
      .andWhere('user.user_id != :userId', { userId })
      .getMany();

    // Group by member and collect shared projects
    const map = new Map();

    for (const pm of workedWithMembers) {
      const member = pm.user;
      const project = pm.project;
      if (!member || !project) continue;

      if (!map.has(member.user_id)) {
        map.set(member.user_id, {
          id: member.user_id,
          name: `${member.first_name} ${member.last_name}`,
          email: member.email,
          profileImage: member.profileImage,
          designation: member.designation,
          projectsWorkedTogether: [],
        });
      }

      map.get(member.user_id).projectsWorkedTogether.push({
        id: project.project_id,
        title: project.title,
        start_date: project.start_date,
        end_date: project.end_date,
        deleted_at: project.deleted_at, //  so you know if project is archived
      });
    }

    return Array.from(map.values());
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
