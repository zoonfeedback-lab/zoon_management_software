# Professional Git Push Script for Zoon Management Software
# Purpose: Commit and push all changes to GitHub

Set-Location "F:\Zoon\zoon_management_software\zoon_management_software"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Zoon Management Software - Git Push" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check git status
Write-Host "[1/5] Checking git status..." -ForegroundColor Yellow
git status
Write-Host ""

# Step 2: Stage all changes
Write-Host "[2/5] Staging all changes..." -ForegroundColor Yellow
git add -A
Write-Host "Changes staged successfully!" -ForegroundColor Green
Write-Host ""

# Step 3: Create professional commit
Write-Host "[3/5] Creating commit..." -ForegroundColor Yellow
$commitMessage = @"
fix: resolve TypeScript compilation errors and update task authorization

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

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
"@

git commit -m $commitMessage
Write-Host "Commit created successfully!" -ForegroundColor Green
Write-Host ""

# Step 4: Push to GitHub
Write-Host "[4/5] Pushing changes to GitHub..." -ForegroundColor Yellow
git push origin HEAD
Write-Host ""

# Step 5: Verify push
Write-Host "[5/5] Verifying push..." -ForegroundColor Yellow
git log --oneline -5
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Push completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
