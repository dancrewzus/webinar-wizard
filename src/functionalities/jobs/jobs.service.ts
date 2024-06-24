import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';

import * as customParseFormat from 'dayjs/plugin/customParseFormat'
import * as isBetween from 'dayjs/plugin/isBetween'
import * as timezone from 'dayjs/plugin/timezone'
import * as utc from 'dayjs/plugin/utc'

import * as dayjs from 'dayjs'

dayjs.extend(customParseFormat)
dayjs.extend(isBetween)
dayjs.extend(timezone)
dayjs.extend(utc)

dayjs.tz.setDefault('America/Caracas')

import { HandleErrors } from 'src/common/utils/handleErrors.util';
import { Role } from 'src/functionalities/roles/entities/role.entity'
import { Image } from '../images/entities/image.entity'
import { User } from '../users/entities/user.entity';
import { Track } from '../tracks/entities/track.entity';
import { Webinar } from '../webinars/entities/webinar.entity';

@Injectable()
export class JobsService {

  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectModel(Webinar.name, 'backup') private readonly webinarModelBackup: Model<Webinar>,
    @InjectModel(Track.name, 'backup') private readonly trackModelBackup: Model<Track>,
    @InjectModel(Image.name, 'backup') private readonly imageModelBackup: Model<Image>,
    @InjectModel(Role.name, 'backup') private readonly roleModelBackup: Model<Role>,
    @InjectModel(User.name, 'backup') private readonly userModelBackup: Model<User>,
    
    @InjectModel(Webinar.name, 'production') private readonly webinarModelProduction: Model<Webinar>,
    @InjectModel(Track.name, 'production') private readonly trackModelProduction: Model<Track>,
    @InjectModel(Image.name, 'production') private readonly imageModelProduction: Model<Image>,
    @InjectModel(Role.name, 'production') private readonly roleModelProduction: Model<Role>,
    @InjectModel(User.name, 'production') private readonly userModelProduction: Model<User>,

    @InjectModel(Webinar.name, 'test') private readonly webinarModelTest: Model<Webinar>,

    private readonly handleErrors: HandleErrors,
  ) { }

  @Cron('4 * * * *')
  async checkWebinars() {
    console.log('Inicia evaluación')
    try {
      const now = dayjs.tz()
      const webinarsScheduled = await this.webinarModelTest.find({ status: 'scheduled' }).populate('attendees')
      const webinarsInProgress = await this.webinarModelTest.find({ status: 'in-progress' }).populate('attendees')

      const webinars = [ ...webinarsScheduled, ...webinarsInProgress ]
      for (let index = 0; index < webinars.length; index++) {
        const webinar = webinars[index];
        const { date, status, duration } = webinar
        const webinarDate = dayjs(date, 'DD/MM/YYYY HH:mm:ss').tz()

        const webinarDateMinutesRestA = dayjs(date, 'DD/MM/YYYY HH:mm:ss').tz().subtract(30, 'minute')
        const webinarDateMinutesRestB = dayjs(date, 'DD/MM/YYYY HH:mm:ss').tz().subtract(25, 'minute')
        
        const webinarDateMinutesAdd = dayjs(date, 'DD/MM/YYYY HH:mm:ss').tz().add(duration, 'minute')

        const isBetween = now.isBetween(webinarDateMinutesRestA, webinarDateMinutesRestB)
        const isAfterScheduled = now.isAfter(webinarDate)
        const isAfterWebinarEnds = now.isAfter(webinarDateMinutesAdd)

        // Antes del webinar
        if(status === 'scheduled' && isBetween) {
          console.log('Envía correo')
        }
        
        // Durante el webinar
        if(status === 'scheduled' && isAfterScheduled) {
          webinar.status = 'in-progress'
          console.log('En progreso')
        }
        
        // Después del webinar
        if(isAfterWebinarEnds) {
          webinar.status = 'completed'
          console.log('Completado')
        }

        await webinar.save()
      }
    } catch (error) {
      this.handleErrors.handleExceptions(error)
    }
  }

  @Cron('10 1,13 * * *')
  async executeBackup() {
    try {
      const [
        webinars,
        tracks,
        images,
        roles,
        users
      ] = await Promise.all([
        this.webinarModelProduction.find().populate([ 'attendees', 'createdBy' ]),
        this.trackModelProduction.find().populate('user'),
        this.imageModelProduction.find().populate('createdBy'),
        this.roleModelProduction.find().populate('users'),
        this.userModelProduction.find().populate([ 'webinars', 'profilePicture', 'role' ]),
      ])

      await Promise.all([
        this.webinarModelBackup.deleteMany(),
        this.trackModelBackup.deleteMany(),
        this.imageModelBackup.deleteMany(),
        this.roleModelBackup.deleteMany(),
        this.userModelBackup.deleteMany(),
      ])
      await this.roleModelBackup.insertMany(roles)
      await this.userModelBackup.insertMany(users)
      await this.imageModelBackup.insertMany(images)
      await this.trackModelBackup.insertMany(tracks)
      await this.webinarModelBackup.insertMany(webinars)

      // const allData = [ ...notifications, ...tracks, ...images, ...users, ...roles ]
      // TODO: Send allData to a JSON file. backup_11-05-24-07:21:00

      // this.logger.debug('Executed at 01:10am an 01:10pm every day.')

    } catch (error) {
      this.handleErrors.handleExceptions(error)
    }
  }
}