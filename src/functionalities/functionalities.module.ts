import { Module } from '@nestjs/common'

import { ImagesModule } from './images/images.module'
import { RolesModule } from './roles/roles.module'
import { UsersModule } from './users/users.module'
import { SeedModule } from './seed/seed.module'
import { NotificationsModule } from './notifications/notifications.module';
import { TracksModule } from './tracks/tracks.module'
import { WebinarsModule } from './webinars/webinars.module'
import { JobsModule } from './jobs/jobs.module'

@Module({
  imports: [
    JobsModule,
    TracksModule,
    SeedModule,
    RolesModule,
    UsersModule,
    ImagesModule,
    NotificationsModule,
    WebinarsModule,
  ],
  exports: [ ],
})
export class FunctionalitiesModule {}
