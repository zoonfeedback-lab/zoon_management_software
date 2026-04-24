import { Test, TestingModule } from '@nestjs/testing';
import { DeliverablesController } from './deliverables.controller';
import { DeliverablesService } from './deliverables.service';
import { RoleKey } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockGuard = { canActivate: () => true };

describe('DeliverablesController', () => {
  let controller: DeliverablesController;

  const mockDeliverablesService = {
    create: jest.fn(),
    findByProject: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@test.com',
    fullName: 'Admin',
    role: RoleKey.ADMIN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliverablesController],
      providers: [
        { provide: DeliverablesService, useValue: mockDeliverablesService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();

    controller = module.get<DeliverablesController>(DeliverablesController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a deliverable', async () => {
      const dto = {
        fileName: 'report.pdf',
        fileUrl: 'https://s3.test/report.pdf',
        projectId: '',
      };
      const result = { id: 'd-1', fileName: 'report.pdf' };
      mockDeliverablesService.create.mockResolvedValue(result);

      const response = await controller.create('p-1', dto, mockUser);

      expect(dto.projectId).toBe('p-1');
      expect(response).toEqual({ data: result });
      expect(mockDeliverablesService.create).toHaveBeenCalledWith(dto, 'admin-1');
    });
  });

  describe('findByProject', () => {
    it('should return deliverables for project', async () => {
      const result = [{ id: 'd-1' }];
      mockDeliverablesService.findByProject.mockResolvedValue(result);

      expect(await controller.findByProject('p-1')).toEqual({ data: result });
      expect(mockDeliverablesService.findByProject).toHaveBeenCalledWith('p-1');
    });
  });

  describe('remove', () => {
    it('should delete and return result', async () => {
      const result = { deleted: true };
      mockDeliverablesService.remove.mockResolvedValue(result);

      expect(await controller.remove('d-1')).toEqual({ data: result });
      expect(mockDeliverablesService.remove).toHaveBeenCalledWith('d-1');
    });
  });
});
