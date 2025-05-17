# WorkVow Schema Migration

This document explains the schema changes implemented in the WorkVow application, the migration process, and how to ensure a smooth transition.

## Schema Changes

### Old Schema
Previously, the data was organized in multiple root-level collections:
- `users`: User account information
- `commitments`: Daily commitments made by users
- `reports`: End-of-day reports submitted by users
- `user_stats`: Aggregated statistics for each user
- `announcements`: Company announcements

### New Schema
The new schema is more hierarchical, with nested subcollections under users:

- `users/{userId}`: User account information
  - Fields: `uid`, `email`, `name`, `role`, `joinedDate`, `isActive`, `profilePictureUrl`, `lastLogin`
  
  - Subcollection: `users/{userId}/commitments`
    - `daily/{dateStr}`: Daily commitments
      - Fields: `target`, `achieved`, `startDate`, `endDate`, `status`, `dayOfWeek`, `dayOfMonth`, `expectedClosures`, `totalExpectedRevenue`, `createdAt`, `updatedAt`
    - `weekly/{weekStr}`: Weekly aggregated commitments
      - Fields: `target`, `achieved`, `startDate`, `endDate`, `status`, `weekNumber`, `expectedClosures`, `totalExpectedRevenue`, `createdAt`, `updatedAt`
    - `monthly/{monthStr}`: Monthly aggregated commitments
      - Fields: `target`, `achieved`, `startDate`, `endDate`, `status`, `monthNumber`, `expectedClosures`, `totalExpectedRevenue`, `createdAt`, `updatedAt`
  
  - Subcollection: `users/{userId}/stats`
    - `weeklyAccomplishments/{weekStr}`: Weekly accomplishment statistics
      - Fields: `tasksCompleted`, `extraTasks`, `startDate`, `endDate`, `createdAt`, `updatedAt`
    - `monthlyAccomplishments/{monthStr}`: Monthly accomplishment statistics
      - Fields: `tasksCompleted`, `extraTasks`, `startDate`, `endDate`, `createdAt`, `updatedAt`
  
  - Subcollection: `users/{userId}/reports/{dateStr}`: Daily reports
    - Fields: `callsMade`, `callsTarget`, `completion`, `prospects`, `prospectsCount`, `meetingsBooked`, `totalExpectedRevenue`, `feedback`, `date`, `dateStr`, `weekStr`, `monthStr`, `year`, `month`, `day`, `weekNumber`, `createdAt`, `updatedAt`

- `announcements`: Company announcements (unchanged)
- `prospects`: Sales prospects (unchanged)

### Benefits of the New Schema

1. **User-Centric Organization**: All user-related data is now nested under the user document, making it easier to retrieve and manage.

2. **Improved Query Performance**: Querying for data specific to a user is more efficient, as you no longer need to filter across large collections.

3. **Better Data Ownership**: Clear ownership boundaries with user-specific subcollections.

4. **Reduced Data Duplication**: The hierarchical structure eliminates the need to include user information in every document.

5. **Simplified Security Rules**: Security rules can be applied at the user level, making them more straightforward and effective.

## Migration Process

The application includes a migration utility to transfer data from the old schema to the new schema:

1. The migration script can be run from the admin page at `/admin/migrate`.

2. Only users with the `admin` role can run the migration.

3. The migration process:
   - Updates user documents to match the new schema
   - Transfers commitments to the appropriate daily, weekly, and monthly collections
   - Moves reports to user-specific subcollections
   - Creates the new stats structure with weekly and monthly accomplishments

4. The migration logs all actions and errors to help troubleshoot any issues.

## Running the Migration

### Prerequisites
1. Ensure you have a backup of your Firestore database before proceeding.
2. The migration should be run only once.
3. Ensure no users are actively using the application during migration.

### Steps
1. Log in as an admin user.
2. Navigate to `/admin/migrate`.
3. Review the migration information.
4. Click "Run Migration" to start the process.
5. Monitor the logs for any errors.
6. Once completed, verify the data has been migrated correctly.

## Post-Migration Cleanup

After a successful migration and verification:

1. The old collections (`commitments`, `user_stats`, and `reports`) can be deleted.
2. The Firestore security rules have been updated to disable access to these obsolete collections.

## Troubleshooting

If the migration encounters errors:

1. Check the migration logs for specific error messages.
2. Resolve any data inconsistencies in the source data.
3. Ensure the admin user has the necessary permissions in Firestore.
4. For partial migrations, you may need to clear the partially migrated data before retrying.

## Schema Field Descriptions

### User Document
- `uid`: User ID (same as Firebase Auth UID)
- `email`: User's email address
- `name`: User's display name
- `role`: User role ("employee" or "admin")
- `joinedDate`: Timestamp when the user joined
- `isActive`: Boolean indicating if the user account is active
- `profilePictureUrl`: URL to the user's profile picture (optional)
- `lastLogin`: Timestamp of the user's last login

### Commitments
- `target`: Number of calls the user committed to make
- `achieved`: Number of calls actually made
- `startDate`: Start date of the commitment period
- `endDate`: End date of the commitment period
- `status`: Status of the commitment ("pending", "achieved", "missed")
- `expectedClosures`: Number of expected closures (or detailed closure objects for daily)
- `totalExpectedRevenue`: Total expected revenue from closures
- `createdAt`: Timestamp when the record was created
- `updatedAt`: Timestamp when the record was last updated

### Stats
- `tasksCompleted`: Number of completed tasks/commitments
- `extraTasks`: Number of tasks completed beyond the target
- `startDate`: Start date of the stats period
- `endDate`: End date of the stats period
- `createdAt`: Timestamp when the record was created
- `updatedAt`: Timestamp when the record was last updated

### Reports
- `callsMade`: Number of calls made
- `callsTarget`: Target number of calls from the commitment
- `completion`: Percentage of completion (calls made / calls target)
- `prospects`: Array of prospect objects
- `prospectsCount`: Number of prospects
- `meetingsBooked`: Number of meetings booked
- `totalExpectedRevenue`: Total expected revenue
- `feedback`: User feedback/notes
- `dateStr`: ISO date string (YYYY-MM-DD)
- `weekStr`: Week identifier (YYYY-WXX)
- `monthStr`: Month identifier (YYYY-MM)
- `createdAt`: Timestamp when the record was created
- `updatedAt`: Timestamp when the record was last updated 