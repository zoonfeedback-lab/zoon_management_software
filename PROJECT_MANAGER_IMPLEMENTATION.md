# Project Manager Feature Implementation Guide

## Overview

The Project Manager feature enables admins to assign a team member as a project manager who can:
- Manage team members assigned to their projects
- Assign tasks to team members
- Review completed tasks and send revision requests with feedback
- Track task progress and revisions

## Database Schema Changes

### New Fields Added to `Project` Model
- `projectManagerId` (String, optional): UUID of the project manager (must be a TEAM_MEMBER)
- `projectManager` (User, relation): The user assigned as project manager

### New Model: `TaskRevision`
Tracks feedback and revisions on tasks:

```prisma
model TaskRevision {
  id            String              @id @default(cuid())
  taskId        String
  task          Task                @relation(fields: [taskId], references: [id], onDelete: Cascade)
  projectId     String
  project       Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  feedback      String              @db.Text
  status        RevisionStatus      @default(PENDING)
  createdById   String
  createdBy     User                @relation("TaskRevisionsCreated", fields: [createdById], references: [id])
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  @@index([taskId])
  @@index([projectId])
  @@index([createdById])
}

enum RevisionStatus {
  PENDING
  APPROVED
  REJECTED
}
```

## API Endpoints

### Project Management

#### `GET /project-manager/projects`
Get all projects managed by the current user.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Website Project",
      "projectManagerId": "pm-uuid",
      "members": [
        {
          "id": "member-uuid",
          "user": {
            "id": "user-uuid",
            "fullName": "Developer Name",
            "email": "dev@example.com"
          }
        }
      ],
      "tasks": []
    }
  ]
}
```

#### `GET /project-manager/projects/:projectId`
Get details of a specific managed project.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Website Project",
    "client": { "companyName": "Acme Corp" },
    "projectManager": { "id": "pm-uuid", "fullName": "Manager" },
    "members": [],
    "tasks": []
  }
}
```

### Team Member Management

#### `GET /project-manager/projects/:projectId/team`
Get all team members assigned to a project.

**Response:**
```json
{
  "data": [
    {
      "id": "member-id",
      "userId": "user-id",
      "user": {
        "id": "user-id",
        "fullName": "Developer",
        "email": "dev@example.com",
        "role": { "key": "TEAM_MEMBER" }
      }
    }
  ]
}
```

#### `POST /project-manager/projects/:projectId/team`
Add a new team member to the project.

**Request Body:**
```json
{
  "memberId": "user-id"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "member-id",
    "userId": "user-id",
    "user": { /* user details */ }
  }
}
```

#### `DELETE /project-manager/projects/:projectId/team/:memberId`
Remove a team member from the project.

**Response:** `200 OK`

### Task Management

#### `GET /project-manager/projects/:projectId/tasks`
Get all tasks for a project.

**Response:**
```json
{
  "data": [
    {
      "id": "task-id",
      "title": "Task Title",
      "status": "IN_PROGRESS",
      "assignedTo": { /* user details */ },
      "project": { "name": "Project Name" }
    }
  ]
}
```

#### `GET /project-manager/projects/:projectId/tasks/:taskId`
Get details of a specific task.

#### `PATCH /project-manager/projects/:projectId/tasks/:taskId/assign`
Assign a task to a team member.

**Request Body:**
```json
{
  "assignedToId": "user-id"
}
```

**Response:** `200 OK`

### Task Revisions

#### `POST /project-manager/projects/:projectId/tasks/:taskId/revisions`
Create a revision/feedback for a completed task.

**Request Body:**
```json
{
  "feedback": "Please adjust the button colors to match brand guidelines"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "revision-id",
    "taskId": "task-id",
    "projectId": "project-id",
    "feedback": "Please adjust the button colors...",
    "status": "PENDING",
    "createdBy": { /* user details */ },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### `GET /project-manager/projects/:projectId/tasks/:taskId/revisions`
Get all revisions for a task.

**Response:**
```json
{
  "data": [
    {
      "id": "revision-id",
      "feedback": "First round feedback",
      "status": "PENDING",
      "createdBy": { /* user details */ },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### `PATCH /project-manager/revisions/:revisionId/approve`
Approve a pending revision.

**Response:** `200 OK`

#### `PATCH /project-manager/revisions/:revisionId/reject`
Reject a revision and request changes.

**Request Body:**
```json
{
  "feedback": "The changes look good but we need to adjust spacing"
}
```

**Response:** `200 OK`

### Team Member Dashboard

#### `GET /project-manager/my-tasks`
Get all tasks assigned to the current team member.

**Response:**
```json
{
  "data": [
    {
      "id": "task-id",
      "title": "Task Title",
      "status": "IN_PROGRESS",
      "assignedToId": "user-id",
      "project": {
        "name": "Project Name",
        "projectManager": { /* manager details */ }
      },
      "revisions": []
    }
  ]
}
```

## Service Classes

### ProjectManagerService

Core business logic for project manager operations:

- `getManagedProjects(user)` - Get all projects managed by user
- `getManagedProject(projectId, user)` - Get specific project details
- `getProjectTeam(projectId, user)` - Get team members
- `addTeamMember(projectId, memberId, user)` - Add team member
- `removeTeamMember(projectId, memberId, user)` - Remove team member
- `getProjectTasks(projectId, user)` - Get project tasks
- `getTask(taskId, projectId, user)` - Get task details
- `assignTask(taskId, projectId, memberId, user)` - Assign task to member

### TaskRevisionService

Handles task revisions and feedback lifecycle:

- `createRevision(taskId, projectId, dto, user)` - Create revision with feedback
- `getTaskRevisions(taskId, projectId, user)` - Get all revisions for task
- `approveRevision(revisionId, projectId, user)` - Approve revision
- `rejectRevision(revisionId, projectId, feedback, user)` - Reject with feedback

## Permission Model

### Role-Based Access Control

- **ADMIN**: Can manage all projects, assign project managers
- **TEAM_MEMBER (as Project Manager)**: Can manage assigned projects only
- **TEAM_MEMBER**: Can view assigned tasks and revisions

### Validation Rules

1. **Project Manager Assignment**:
   - Only TEAM_MEMBER role can be assigned as PM
   - Assigned during project creation or via update endpoint

2. **Team Member Management**:
   - Only PM can add/remove team members from their project
   - Added members must have TEAM_MEMBER role

3. **Task Assignment**:
   - Only PM can assign tasks in their project
   - Task must be unassigned or previously assigned

4. **Revision Creation**:
   - Only PM can create revisions for tasks in their project
   - Task must be in DONE status

5. **Team Member Views**:
   - Team members see only tasks assigned to them
   - See revisions for their completed tasks

## DTOs

### CreateTaskRevisionDto
```typescript
{
  feedback: string; // Required, min 10 chars, max 1000 chars
}
```

### AssignTaskDto
```typescript
{
  assignedToId: string; // UUID of team member
}
```

### AddTeamMemberDto
```typescript
{
  memberId: string; // UUID of user to add
}
```

### RejectRevisionDto
```typescript
{
  feedback: string; // Required, additional feedback for rejection
}
```

## Test Coverage

### Unit Tests
- **ProjectManagerService**: 6 test cases
  - Get managed projects
  - Get specific project
  - Get team members
  - Add team member
  - Assign task
  - Remove team member

- **TaskRevisionService**: 5 test cases
  - Create revision
  - Get revisions
  - Approve revision
  - Reject revision
  - Permission checks

- **ProjectManagerController**: 8 test cases
  - All endpoint functionality
  - Authorization checks
  - Error handling

### Integration Tests
- `project-manager.integration.spec.ts`: 10 test cases
  - Complete workflow from project creation to revisions
  - Team member management flow
  - Task assignment flow
  - Revision approval/rejection flow

### Service Tests Updates
- `projects.service.spec.ts`: Updated with 4 new test cases
  - Project manager validation
  - PM role checking
  - PM assignment during creation
  - PM updates

## Running Tests

```bash
# All tests
npm run test

# Specific test file
npm run test -- project-manager.controller.spec.ts

# With coverage
npm run test -- --coverage

# Watch mode
npm run test -- --watch
```

## Database Migration

Before running the application, execute the migration:

```bash
npx prisma migrate dev --name add_project_manager_and_task_revisions
```

This will:
1. Add `projectManagerId` field to `Project` table
2. Create `TaskRevision` table with all necessary columns and indexes
3. Add foreign key relationships
4. Create database indexes for performance

## Swagger Documentation

All endpoints are fully documented in Swagger with:
- Detailed operation descriptions
- Parameter documentation with examples
- Request/response body examples
- Error response documentation
- Authorization requirements

Access Swagger UI at: `http://localhost:3000/api`

## Implementation Notes

### Architecture Decisions

1. **Single Service Approach**: All PM-related services integrated into TasksModule rather than separate module
2. **Role-Based Access**: TEAM_MEMBER role used for PM designation (not creating new TEAM_MANAGER role)
3. **Revision System**: Independent of approval workflow - tracks PM feedback separately
4. **Backward Compatibility**: Existing admin functionality unchanged; PM feature is additive

### Key Implementation Details

- PM can only access projects they manage (validated via `projectManagerId === user.id`)
- PM can only manage team members added to their projects
- Task revisions track PM feedback with status (PENDING/APPROVED/REJECTED)
- All services use dependency injection with full mock support for testing
- Comprehensive error handling with appropriate HTTP status codes

## Future Enhancements

1. Add notifications when revisions are created/approved
2. Add revision history and change tracking
3. Add task completion metrics per PM
4. Add team member performance analytics
5. Add bulk task assignment
6. Add revision templates for common feedback
7. Add task priority management by PM
8. Add team capacity planning tools

## Troubleshooting

### Common Issues

**Error: "You are not the manager of this project"**
- Ensure user is assigned as projectManagerId
- Check project is in active status
- Verify JWT token contains correct user ID

**Error: "User is not eligible to join team"**
- Only TEAM_MEMBER role can be added
- User must be active (isActive: true)
- User must not already be member of project

**Error: "Task is not in DONE status"**
- Can only create revisions for completed tasks
- Update task status to DONE first
- Check task status in database

### Debugging

Enable debug logging:
```typescript
// In service methods
console.log('PM Check:', { userId: user.id, projectManagerId });
console.log('Permission denied for user:', user.email);
```

Check database state:
```bash
npx prisma studio  # Opens Prisma Studio GUI for data inspection
```

## Contact & Support

For implementation questions or issues:
1. Review test cases for usage examples
2. Check Swagger documentation at `/api`
3. Review service method JSDoc comments
4. Check integration test examples
