import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { Webinar, WebinarSchema } from './entities/webinar.entity'
import { Track, TrackSchema } from '../tracks/entities/track.entity'
import { User, UserSchema } from '../users/entities/user.entity'
import { WebinarsController } from './webinars.controller'
import { CommonModule } from '../../common/common.module'
import { WebinarsService } from './webinars.service'
import { AuthModule } from 'src/auth/auth.module'

@Module({
  controllers: [ WebinarsController ],
  providers: [ WebinarsService ],
  imports: [
    AuthModule,
    ConfigModule,
    CommonModule,
    MongooseModule.forFeature([
      {
        name: Track.name,
        schema: TrackSchema
      },
      {
        name: User.name,
        schema: UserSchema
      },
      {
        name: Webinar.name,
        schema: WebinarSchema
      },
    ], 'default')
  ], 
  exports: [ WebinarsService ]
})
export class WebinarsModule {}
