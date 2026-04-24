import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { RoleKey } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockGuard = { canActivate: () => true };

describe('CommentsController', () => {
  let controller: CommentsController;

  const mockCommentsService = {
    create: jest.fn(),
    findByTask: jest.fn(),
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'user@test.com',
    fullName: 'User',
    role: RoleKey.ADMIN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        { provide: CommentsService, useValue: mockCommentsService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();

    controller = module.get<CommentsController>(CommentsController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a comment', async () => {
      const dto = { content: 'Test comment' };
      const result = { id: 'c-1', content: 'Test comment' };
      mockCommentsService.create.mockResolvedValue(result);

      expect(await controller.create('t-1', dto, mockUser)).toEqual({ data: result });
      expect(mockCommentsService.create).toHaveBeenCalledWith('t-1', dto, mockUser);
    });
  });

  describe('findByTask', () => {
    it('should return comments for a task', async () => {
      const result = [{ id: 'c-1' }, { id: 'c-2' }];
      mockCommentsService.findByTask.mockResolvedValue(result);

      expect(await controller.findByTask('t-1', mockUser)).toEqual({ data: result });
      expect(mockCommentsService.findByTask).toHaveBeenCalledWith('t-1', mockUser);
    });
  });
});
