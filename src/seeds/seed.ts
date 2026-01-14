import * as bcrypt from 'bcrypt';
import dataSource from 'src/database/data-source';
import { User } from 'src/user/entities/user.entity';
import { Role } from '../common/enums/user.role.enum';

async function seedUsers() {
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const users = [
    {
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@example.com',
      password: hashedPassword,
      phone: '+9779800000001',
      designation: 'Administrator',
      avatar: 'https://avatar.iran.liara.run/public/20',
      department_name: 'IT',
      user_role: Role.ADMIN,
      isActive: true,
      profileImage: 'https://avatar.iran.liara.run/public/20',
    },
    {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      password: await bcrypt.hash('John@123', 10),
      phone: '+9779800000002',
      designation: 'Manager',
      avatar: null,
      department_name: 'HR',
      user_role: Role.USER,
      isActive: true,
      profileImage: 'https://avatar.iran.liara.run/public/30',
    },
  ];

  for (const user of users) {
    // check if user already exists by email
    const existingUser = await dataSource.manager.findOne(User, {
      where: { email: user.email },
      withDeleted: true,
    });

    if (!existingUser) {
      await dataSource.manager.save(User, user);
    }
  }
}

async function main() {
  try {
    await dataSource.initialize();
    await seedUsers();
    await dataSource.destroy();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

void main();
