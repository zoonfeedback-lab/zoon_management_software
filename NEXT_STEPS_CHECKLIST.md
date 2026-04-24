# Project Manager Feature - Next Steps Checklist

## 📋 Immediate Actions Required

### 1. Database Migration ⚠️ REQUIRED FIRST
```bash
cd F:\Zoon\zoon_management_software\zoon_management_software
npx prisma migrate dev --name add_project_manager_and_task_revisions
```

**What this does:**
- Adds `projectManagerId` field to Project table
- Creates new TaskRevision table
- Sets up all foreign key relationships
- Creates database indexes for performance

### 2. Run Test Suite
```bash
npm run test
```

**Expected Result:**
- All 39 tests should PASS
- No TypeScript compilation errors
- Test execution time: ~30-35 seconds

**If tests fail:**
- Check migration ran successfully
- Verify all files were created/modified
- Review test output for specific errors

### 3. Start Development Server
```bash
npm run start:dev
```

**Expected Result:**
- Server starts on port 3000
- No errors in console
- Ready for API testing

### 4. Verify Swagger Documentation
Open browser and navigate to:
```
http://localhost:3000/api
```

**What to check:**
- ✅ "Project Manager Portal" tag visible
- ✅ All 13 PM endpoints listed
- ✅ All endpoints have detailed descriptions
- ✅ Examples show realistic data
- ✅ Try-it-out buttons functional

## 🧪 Manual Testing Workflow

### Test Scenario 1: Create Project with PM

1. POST `/projects` with:
```json
{
  "name": "Test Project",
  "clientId": "valid-client-id",
  "projectManagerId": "valid-team-member-id"
}
```

2. Verify response includes `projectManagerId`

### Test Scenario 2: PM Views Managed Projects

1. Login as PM (TEAM_MEMBER role)
2. GET `/project-manager/projects`
3. Should return projects where user is projectManagerId

### Test Scenario 3: PM Adds Team Member

1. POST `/project-manager/projects/{projectId}/team` with:
```json
{
  "memberId": "another-team-member-id"
}
```

2. Verify member added successfully

### Test Scenario 4: PM Assigns Task

1. Create a task in the project
2. PATCH `/project-manager/projects/{projectId}/tasks/{taskId}/assign` with:
```json
{
  "assignedToId": "team-member-id"
}
```

3. Verify task assigned

### Test Scenario 5: PM Creates Revision

1. Complete a task (status: DONE)
2. POST `/project-manager/projects/{projectId}/tasks/{taskId}/revisions` with:
```json
{
  "feedback": "Please adjust the styling to match the design system"
}
```

3. Verify revision created with PENDING status

### Test Scenario 6: Team Member Views Tasks

1. Login as team member
2. GET `/project-manager/my-tasks`
3. Should see tasks assigned to them

### Test Scenario 7: PM Approves Revision

1. PATCH `/project-manager/revisions/{revisionId}/approve`
2. Verify revision status changed to APPROVED

### Test Scenario 8: PM Rejects Revision

1. PATCH `/project-manager/revisions/{revisionId}/reject` with:
```json
{
  "feedback": "Please review the color contrast standards"
}
```

2. Verify revision status changed to REJECTED

## 📚 Documentation Reference

### For Developers:
- **Implementation Guide**: `PROJECT_MANAGER_IMPLEMENTATION.md`
  - Complete API reference
  - All endpoint details
  - Permission model
  - Service documentation
  - Troubleshooting

- **Test Cases**: All test files
  - `src/tasks/project-manager.service.spec.ts`
  - `src/tasks/task-revision.service.spec.ts`
  - `src/tasks/project-manager.controller.spec.ts`
  - `src/tasks/project-manager.integration.spec.ts`
  - `src/projects/projects.service.spec.ts`

- **Swagger Documentation**: Live at `/api` after starting server

### For API Testing:
- Import `zoon_api_collection.json` in Postman
- Update with new PM endpoints
- Use examples from Swagger UI

### For Database Inspection:
```bash
npx prisma studio
```

This opens GUI to view and edit database records.

## ✅ Verification Checklist

### After Migration:
- [ ] Migration ran without errors
- [ ] `projectManagerId` field exists in Project table
- [ ] TaskRevision table created with all columns
- [ ] Indexes created for performance
- [ ] No data loss in existing tables

### After Running Tests:
- [ ] All 39 tests pass
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Execution time reasonable (~30s)

### After Starting Server:
- [ ] Server starts without errors
- [ ] Port 3000 accessible
- [ ] Swagger UI loads
- [ ] API endpoints responsive

### After Manual Testing:
- [ ] All 8 test scenarios pass
- [ ] Permission checks working
- [ ] Data persists correctly
- [ ] Revisions track properly
- [ ] Team members see assigned tasks

## 🔧 Troubleshooting

### Migration Failed
**Problem**: Migration fails to run
**Solution**:
1. Check if database is accessible
2. Verify database URL in .env
3. Try: `npx prisma migrate resolve`
4. Check migration file created in `prisma/migrations/`

### Tests Failing
**Problem**: Tests fail after migration
**Solution**:
1. Verify migration completed
2. Clear jest cache: `npx jest --clearCache`
3. Run tests again: `npm run test`
4. Check specific test output for details

### Swagger Not Showing
**Problem**: Swagger UI not loading
**Solution**:
1. Verify server running: `npm run start:dev`
2. Check port 3000 in use
3. Clear browser cache
4. Try incognito/private window

### Permission Denied Errors
**Problem**: Getting "You are not the manager" errors
**Solution**:
1. Verify user is assigned as projectManagerId
2. Check user has TEAM_MEMBER role
3. Verify JWT token contains correct user ID
4. Check user active status (isActive: true)

### Team Member Not Found
**Problem**: Error adding team member
**Solution**:
1. Verify user exists and is active
2. Check user has TEAM_MEMBER role
3. User cannot already be project member
4. Use valid UUID for memberId

## 📊 Expected Results

### Test Output
```
Test Suites: 20 passed, 20 total
Tests:       39 passed, 39 total
Snapshots:   0 total
Time:        30-35s
```

### Swagger Endpoints
- 13 PM Portal endpoints visible
- All with descriptions and examples
- Try-it-out functional
- Authorization decorators applied

### Manual Testing
- All CRUD operations work
- Permission checks enforced
- Data validated properly
- Relationships intact

## 🎯 Success Criteria

✅ All tests passing
✅ Swagger documentation complete
✅ All manual tests successful
✅ No console errors
✅ Permission model working
✅ Database relationships intact
✅ Ready for production deployment

## 📞 Support Resources

### If Issues Arise:
1. Check TROUBLESHOOTING section above
2. Review test files for expected behavior
3. Check Swagger examples
4. Review service JSDoc comments
5. Check database with Prisma Studio

### Key Files to Review:
- `PROJECT_MANAGER_IMPLEMENTATION.md` - API guide
- `SWAGGER_AND_TESTS_UPDATE.md` - Testing details
- `IMPLEMENTATION_SUMMARY.md` - High-level overview
- Service files for implementation details

## 🚀 Post-Testing

### When All Tests Pass:

1. **Deploy to Development**
   - Push code to dev branch
   - Monitor for errors
   - Test with real data

2. **Add to CI/CD Pipeline**
   - Integrate test run
   - Add to pre-commit hooks
   - Monitor code quality

3. **Update Team Documentation**
   - Share API guide with team
   - Train on PM features
   - Create user guides

4. **Monitor in Production**
   - Log permission checks
   - Monitor performance
   - Track error rates
   - Gather user feedback

## 📅 Timeline

- **Migration**: ~2 minutes
- **Tests**: ~30-35 seconds
- **Server Start**: ~5 seconds
- **Manual Testing**: ~15-20 minutes
- **Total**: ~1 hour to full verification

## 🎓 Next Learning Steps

1. Review implementation guide
2. Test all endpoints manually
3. Create custom workflows
4. Add monitoring/logging
5. Plan performance optimization
6. Design future enhancements

---

**Status**: Ready for Testing
**Last Updated**: 2024
**Files Created**: 9
**Files Modified**: 8
**Tests Added**: 39
**Documentation**: Complete
