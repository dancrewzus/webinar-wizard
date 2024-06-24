import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsPositive, IsString, Min } from 'class-validator'

export class CreateWebinarDto {
  
  @ApiProperty({ type: String, description: 'Webinar title', example: 'Introduction to Node.js' })
  @IsString()
  title: string
  
  @ApiProperty({ type: String, description: 'Webinar description', example: 'A comprehensive introduction to Node.js, covering the basics and advanced concepts.' })
  @IsString()
  description: string
  
  @ApiProperty({ type: String, description: 'Webinar presenter', example: 'John Doe' })
  @IsString()
  presenter: string
  
  @ApiProperty({ type: String, description: 'Webinar registration link', example: 'https://webinarwizard.com/register/introduction-to-node-js' })
  @IsString()
  registrationLink: string
  
  @ApiProperty({ type: String, description: 'Webinar date - Format DD/MM/YYYY HH:mm:ss.', example: '01/01/1900 00:00:00' })
  @IsString()
  date: string
  
  @ApiProperty({ type: Number, description: 'Webinar duration in minutes.', example: 60 })
  @IsNumber()
  @IsPositive()
  @Min(10)
  duration: number
  
  @ApiProperty({ type: String, description: 'Webinar status [ "scheduled", "in-progress", "completed" ]', example: 'scheduled' })
  @IsString()
  status: string
  
  @ApiProperty({ type: Number, description: 'Webinar max attendees.', example: 1200 })
  @IsNumber()
  @IsPositive()
  @Min(10)
  maxAttendees: number
}