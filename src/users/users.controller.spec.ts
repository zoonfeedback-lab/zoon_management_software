import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RoleKey } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockGuard = { canActivate: () => true };

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-id',
    email: 'test@example.com',
    fullName: 'Test User',
    role: RoleKey.ADMIN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const dto: CreateUserDto = {
        email: 'test@example.com',
        password: 'Password@123',
        fullName: 'Test User',
        role: RoleKey.TEAM_MEMBER,
      };
      const result = { id: 'new-id', ...dto };
      mockUsersService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual({ data: result });
      expect(mockUsersService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const result = [{ id: '1' }, { id: '2' }];
      mockUsersService.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toEqual({ data: result });
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      const result = { id: 'user-id', email: 'test@example.com' };
      mockUsersService.findOne.mockResolvedValue(result);

      expect(await controller.findOne('user-id', mockUser)).toEqual({ data: result });
      expect(mockUsersService.findOne).toHaveBeenCalledWith('user-id', mockUser);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const dto: UpdateUserDto = { fullName: 'Updated Name' };
      const result = { id: 'user-id', ...dto };
      mockUsersService.update.mockResolvedValue(result);

      expect(await controller.update('user-id', dto, mockUser)).toEqual({ data: result });
      expect(mockUsersService.update).toHaveBeenCalledWith('user-id', dto, mockUser);
    });
  });
});
