
import { Injectable } from '@nestjs/common'
import { Resend } from 'resend';

import { Webinar } from 'src/functionalities/webinars/entities/webinar.entity'
import { User } from 'src/functionalities/users/entities/user.entity';
import { HandleErrors } from '../utils/handleErrors.util';
import { OpenAiAdapter } from './openai.adapter'
import { MailsUtil } from '../utils/mails.util';
import envConfig from '../../config/env.config'


@Injectable()
export class MailAdapter {

  private openai
  
  constructor(
    private readonly openaiAdapter: OpenAiAdapter,
    private readonly errors: HandleErrors,
    private readonly mails: MailsUtil,
  ) {
    this.openai = this.openaiAdapter.getEntity()
  }

  private initInstance = (): Resend => {
    return new Resend(envConfig().resendApiKey);
  }

  private sendEmail = async (mailOptions: any) => {
    const resend = this.initInstance();
    const { data, error } = await resend.emails.send(mailOptions);
    if (error) {
      throw new Error(JSON.stringify(error));
    }
    return data;
  }

  private generateMailOptions = async ({ type, user = null, webinar, emails = null }) => {
    try {
      const webinarData = {
        title: webinar.title,
        description: webinar.description,
        presenter: webinar.presenter,
        date: webinar.date,
        duration: webinar.duration,
      }
      const userData = {
        email: user?.email || '',
        name: user?.name || '',
        surname: user?.surname || '',
        gender: user?.gender || '',
      }
      const emailData = `Tipo de correo: ${ type }. Webinar: {${ JSON.stringify(webinarData) }}.` + ( user ? `Usuario: {${ JSON.stringify(userData) }}` : '')
      const emailResponse = await this.openaiAdapter.generateCompletion(this.openai, emailData)

      const to: string[] = user ? [ userData.email ] : emails
      const listOfEmails = to.map((email: string) => {
        if(email.includes('howarts.magic')) {
          email = 'idepixel@gmail.com'
        }
        return email
      })
      return {
        from: 'Webinar Wizard <webinarwizard@idepixel.cl>',
        subject: emailResponse.title || '',
        html: this.mails.newAttendeeEmail({
          webinar, emailResponse
        }),
        to: listOfEmails,
      };
    } catch (error) {
      return this.errors.handleError(`Error handling new message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public newAttendee = async (user: User, webinar: Webinar) => {
    const mailOptions = await this.generateMailOptions({ type: 'nuevo usuario en webinar', user, webinar })
    try {
      await this.sendEmail(mailOptions)
      return
    } catch (error) {
      this.errors.handleError(error)
    }
  }
  
  public notAttendee = async (user: User, webinar: Webinar) => {
    const mailOptions = await this.generateMailOptions({ type: 'el usuario canceló su participación en el webinar', user, webinar })
    try {
      await this.sendEmail(mailOptions)
      return
    } catch (error) {
      this.errors.handleError(error)
    }
  }

  public cancelWebinar = async (users: User[], webinar: Webinar) => {
    const emails = []
    users.forEach((user) => {
      emails.push(user.email)
    });
    const mailOptions = await this.generateMailOptions({ type: 'se ha cancelado el webinar', emails, webinar })
    try {
      await this.sendEmail(mailOptions)
      return
    } catch (error) {
      this.errors.handleError(error)
    }
  }
}