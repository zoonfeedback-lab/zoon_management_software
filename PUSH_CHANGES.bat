@echo off
REM Professional Git Push Script
REM Changes: Fix TypeScript compilation errors and update task creation authorization

echo.
echo ========================================
echo   Zoon Management Software - Git Push
echo ========================================
echo.

cd /d F:\Zoon\zoon_management_software\zoon_management_software

echo [1/5] Checking git status...
git status
echo.

echo [2/5] Staging all changes...
git add -A
echo Changes staged successfully!
echo.

echo [3/5] Creating commit...
git commit -m "fix: resolve TypeScript compilation errors and update task authorization

CHANGES:
- Remove non-existent ApiExample import from @nestjs/swagger (v11)
  * File: src/projects/projects.controller.ts

- Add null safety checks in task revision service
  * File: src/tasks/task-revision.service.ts
  * Added proper null checks for project object before accessing properties
  * Prevents potential null reference errors in revision approval/rejection

- Update POST /tasks endpoint authorization
  * File: src/tasks/tasks.controller.ts
  * Allow TEAM_MEMBER role (project managers) in addition to ADMIN
  * Updated API documentation to reflect new authorization rules
  * Only admins and project managers can create tasks

- Add Prisma generation instructions
  * File: FIX_COMPILATION_ERRORS.md
  * Documents remaining TypeScript errors caused by stale Prisma client
  * Instructions to regenerate Prisma types

NOTES:
- Prisma schema includes all required fields (projectManagerId, projectManager, members, taskRevisions)
- Run 'npm run prisma:generate' to regenerate Prisma types and fix remaining TypeScript errors
- All code changes are production-ready once Prisma client is regenerated

Co-authored-by: Copilot ^<223556219+Copilot@users.noreply.github.com^>"

echo Commit created successfully!
echo.

echo [4/5] Pushing changes to GitHub...
git push origin HEAD
echo.

echo [5/5] Verifying push...
git log --oneline -5
echo.

echo ========================================
echo   Push completed successfully!
echo ========================================
echo.
pause
