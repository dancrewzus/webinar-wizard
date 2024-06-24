import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Schema as MongooseSchema } from 'mongoose'
import * as mongoosePaginate from 'mongoose-paginate-v2'
import { ApiProperty } from '@nestjs/swagger'

import * as customParseFormat from 'dayjs/plugin/customParseFormat'
import * as timezone from 'dayjs/plugin/timezone'
import * as utc from 'dayjs/plugin/utc'

import * as dayjs from 'dayjs'

dayjs.extend(customParseFormat)
dayjs.extend(timezone)
dayjs.extend(utc)

dayjs.tz.setDefault('America/Caracas')

import { User } from '../../users/entities/user.entity';

@Schema()
export class Webinar extends Document {
  
  @ApiProperty({ description: 'Webinar title', example: 'Introduction to Node.js' })
  @Prop({ type: String, required: true })
  title: string;
  
  @ApiProperty({ description: 'Webinar title slug', example: 'introduction-to-node-js' })
  @Prop({ type: String, required: true })
  slug: string;
  
  @ApiProperty({ description: 'Webinar description', example: 'A comprehensive introduction to Node.js, covering the basics and advanced concepts.' })
  @Prop({ type: String, required: true })
  description: string;
  
  @ApiProperty({ description: 'Webinar presenter', example: 'John Doe' })
  @Prop({ type: String, required: true })
  presenter: string;
  
  @ApiProperty({ description: 'Webinar registration link', example: 'https://webinarwizard.com/register/introduction-to-node-js' })
  @Prop({ type: String, required: true })
  registrationLink: string;

  @ApiProperty({ description: 'Webinar date - Format DD/MM/YYYY HH:mm:ss.', example: '01/01/1900 00:00:00' })
  @Prop({ type: String, required: true })
  date: string

  @ApiProperty({ description: 'Webinar duration in minutes.', example: 60 })
  @Prop({ type: Number, required: true })
  duration: number

  @ApiProperty({ type: String, description: 'Webinar status [ "scheduled", "in-progress", "completed" ]', example: 'scheduled' })
  @Prop({ type: String, default: 'scheduled', enum: [ 'scheduled', 'in-progress', 'completed' ] })
  status: string;

  @ApiProperty({ description: 'Webinar max attendees.', example: 1200 })
  @Prop({ type: Number, required: true })
  maxAttendees: number
  
  @ApiProperty({ description: 'List of users who are registered as attendees of the webinar.', type: [String] })
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], select: false })
  attendees: User[]
  
  @ApiProperty({ type: String, description: 'User creator ID', example: '6472d32b20f00d485b965c1e' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  createdBy: User;

  @ApiProperty({ example: '01/01/1900 00:00:00', description: 'Deletion date.' })
  @Prop({ type: String, default: null, nullable: true })
  deletedAt?: string;
  
  @ApiProperty({ example: '01/01/1900 00:00:00', description: 'Creation date.' })
  @Prop({ type: String, required: true })
  createdAt?: string;
  
  @ApiProperty({ example: '01/01/1900 00:00:00', description: 'Updated date.' })
  @Prop({ type: String, required: true })
  updatedAt?: string;
  
  @ApiProperty({ example: false, description: 'Soft delete' })
  @Prop({ type: Boolean, default: false })
  deleted: boolean;
}

export const WebinarSchema = SchemaFactory.createForClass( Webinar )
WebinarSchema.plugin(mongoosePaginate)

