import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate-v2'
import { ApiProperty } from '@nestjs/swagger';

import { Image } from 'src/functionalities/images/entities/image.entity';
import { Role } from 'src/functionalities/roles/entities/role.entity';
import { Webinar } from 'src/functionalities/webinars/entities/webinar.entity';

@Schema()
export class User extends Document {

  @Prop({ type: String, required: false })
  @ApiProperty({
    example: 'adumbledore@howarts.magic',
    description: 'User email.',
    uniqueItems: true
  })
  email: string;
  
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isLogged: boolean;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ type: String, default: '' })
  recoveryCode: string;
  
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  surname: string;
  
  @Prop({ type: String, required: true })
  gender: string;

  @Prop({ type: String, required: true })
  phoneNumber: string;
  
  @Prop({ type: String, required: true })
  validationCode: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Image', default: null, nullable: true })
  profilePicture: Image;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Role', required: true })
  role: Role;

  @ApiProperty({ description: 'List of webinars that user is registered.', type: [String] })
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Webinar' }], select: false })
  webinars: Webinar[]

  @ApiProperty({ example: '01/01/1900 00:00:00', description: 'Deletion date.' })
  @Prop({ type: String, default: null, nullable: true })
  deletedAt?: string;
  
  @ApiProperty({ example: '01/01/1900 00:00:00', description: 'Creation date.' })
  @Prop({ type: String, required: true })
  createdAt?: string;
  
  @ApiProperty({ example: '01/01/1900 00:00:00', description: 'Updated date.' })
  @Prop({ type: String, required: true })
  updatedAt?: string;

  @Prop({ type: Boolean, default: false })
  deleted: boolean;
}

export const UserSchema = SchemaFactory.createForClass( User )
UserSchema.plugin(mongoosePaginate)
