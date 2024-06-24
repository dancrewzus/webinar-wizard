import { Injectable, NotFoundException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { InjectModel } from "@nestjs/mongoose"
import { PaginateModel, Model, isValidObjectId, PaginateOptions } from "mongoose"

import { DayJSAdapter } from "src/common/adapters/dayjs.adapter"
import { HandleErrors } from "src/common/utils/handleErrors.util"
import { MailAdapter } from "src/common/adapters/mail.adapter"
import { CreateWebinarDto } from "./dto/create-webinar.dto"
import { error } from 'src/common/constants/error-messages'
import { Track } from "../tracks/entities/track.entity"
import { Webinar } from "./entities/webinar.entity"
import { User } from "../users/entities/user.entity"
import { Utils } from "src/common/utils/utils"

@Injectable()
export class WebinarsService {

  private defaultLimit: number;

  constructor(
    @InjectModel(Webinar.name, 'default') private readonly webinarModel: PaginateModel<Webinar>,
    @InjectModel(User.name, 'default') private readonly userModel: PaginateModel<User>,
    @InjectModel(Track.name, 'default') private readonly trackModel: Model<Track>,
    private readonly configService: ConfigService,
    private readonly handleErrors: HandleErrors,
    private readonly dayjs: DayJSAdapter,
    private readonly mail: MailAdapter,
    private readonly utils: Utils,
  ) {
    this.defaultLimit = this.configService.get<number>('defaultLimit')
  }

  /**
   * Determines the type of the given search parameter. This function checks if the search parameter is a valid
   * MongoDB ObjectId, a valid slug, or neither. It helps in categorizing the search input for appropriate handling
   * in the application.
   *
   * @private
   * @function searchType
   * @param {string | number} search - The search parameter to be evaluated, which can be either a string or a number.
   * @returns {string} Returns 'id' if the search parameter is a valid MongoDB ObjectId, 'slug' if it matches the slug
   *                   pattern, or 'invalid' if it matches neither criteria.
   */
  private searchType = (search: string | number): string => {
    if(isValidObjectId(search)) {
      return 'id'
    }
    if(this.utils.isValidSlug(`${ search }`)) {
      return 'slug'
    }
    return 'invalid'
  }

  /**
   * Finds and retrieves a webinar from the database based on the given search parameter, which can be either an ID
   * or an slug. This function first determines the type of the search parameter using the `searchType` method, then
   * queries the database accordingly. It also populates the `createdBy` field to include information about the creator
   * of the webinar. If no webinar is found, it throws a NotFoundException.
   *
   * @private
   * @async
   * @function findWebinar
   * @param {string} search - The search parameter to find the webinar, which can be an ID or an slug.
   * @returns {Promise<webinar>} A promise that resolves to the webinar object if found, or rejects with an error
   *                              if the webinar cannot be found or if an error occurs during the query.
   * @throws {NotFoundException} Throws this exception if no webinar is found with the given search parameter.
   */
  private findWebinar = async (search: string): Promise<Webinar> => {
    try {
      let webinar: Webinar;
      const searchTypeResponse = this.searchType(search)
      switch (searchTypeResponse) {
        case 'id':
          webinar = await this.webinarModel.findById(search)
                  .populate('createdBy')
                  .populate('attendees')
          break;
        case 'slug':
          webinar = await this.webinarModel.findOne({ slug: search.toLocaleLowerCase() })
                  .populate('createdBy')
                  .populate('attendees')
          break;
        default:
          webinar = null;
          break;
      }
      if(!webinar) {
        throw new NotFoundException(`Webinar with ${ searchTypeResponse } "${ search }" not found`)
      }
      return webinar;
    } catch (error) {
      this.handleErrors.handleExceptions(error)
    }
  }

  /**
   * Creates a new webinar in the database using the provided data. This function takes the webinar data from
   * the CreateWebinarDto, along with the user making the request and their IP address, to create a new webinar.
   * It also logs the creation action in a tracking model for auditing purposes.
   *
   * @public
   * @async
   * @function create
   * @param {CreateWebinarDto} createWebinarDto - Data transfer object containing the details of the webinar to be created.
   * @param {User} userRequest - The user object of the requester, used to set the `createdBy` field.
   * @param {string} clientIp - The IP address from which the creation request originated, used for logging purposes.
   * @returns {Promise<Webinar>} A promise that resolves to the newly created webinar object. If an error occurs,
   *                              it is caught and handled appropriately.
   * @throws Handles any exceptions that occur during the webinar creation process and logs them.
   */
  public create = async (createWebinarDto: CreateWebinarDto, userRequest: User, clientIp: string): Promise<Webinar> => {
    try {
      const { title, ...restOfData } = createWebinarDto
      const slug = this.utils.convertToSlug(title)
      const webinar = await this.webinarModel.create({
        title,
        slug,
        createdBy: userRequest.id,
        createdAt: this.dayjs.getCurrentDateTime(),
        updatedAt: this.dayjs.getCurrentDateTime(),
        ...restOfData
      });
      await this.trackModel.create({
        ip: clientIp,
        description: `Webinar ${ webinar._id } was created.`,
        module: 'Webinars',
        createdAt: this.dayjs.getCurrentDateTime(),
        user: userRequest.id
      })
      return webinar
    } catch (error) {
      this.handleErrors.handleExceptions(error)
    }
  }

  /**
   * Retrieves a paginated list of webinars from the database, with optional filtering. This function parses the
   * pagination and filtering parameters from the provided DTO, constructs a query to fetch the webinars, and
   * includes related data such as the creator information. The response includes pagination metadata and the list
   * of webinars.
   *
   * @public
   * @async
   * @function findWebinars
   * @param {any} paginationDto - An object containing pagination parameters such as `limit`, `offset`, and an optional `filter` string,
   *                              or a JSON string that can be parsed into these parameters.
   * @returns {Promise<object>} A promise that resolves to an object containing pagination metadata and an array of webinars.
   *                            The structure of the return is { data: { pagination: {}, webinars: [] }}. If an error occurs,
   *                            it is caught and handled appropriately.
   * @throws {Error} Handles and logs any errors that occur during the execution.
   */
  public findWebinars = async (paginationDto: any, userRequest: User) => {
    const { id, role } = userRequest
    const isClient = role.name === 'client'
    const { limit, offset, filter } = paginationDto ? JSON.parse(paginationDto) : { limit: this.defaultLimit, offset: 0, filter: '' };
    const setOffset = offset === undefined ? 0 : offset
    const setLimit = limit === undefined ? this.defaultLimit : limit
    const isSearch = filter !== '' ? true : false
    try {
      if(filter !== 'my-webinars') {
        const options: PaginateOptions = {
          offset: setOffset,
          limit: setLimit,
          populate: !isClient ? [
            { path: 'createdBy' },
            { path: 'attendees' }
          ] : [
            { path: 'attendees' }
          ],
          sort: { createdAt: 1 },
          customLabels: {
            meta: 'pagination'
          }
        };        
        let data: any = {
          deleted: false
        }
        if(isSearch) {
          data = {
            $or: [
              { 
                slug: new RegExp(filter, 'i'),
                deleted: false
              },
              { 
                name: new RegExp(filter, 'i'),
                deleted: false
              },
              { 
                status: new RegExp(filter, 'i'),
                deleted: false
              },
            ]
          }
        }
        const webinars = await this.webinarModel.paginate(data, options)
        return {
          data: {
            pagination: webinars?.pagination || {},
            webinars: webinars?.docs.map((webinar) => {
              const newWebinar = JSON.parse(JSON.stringify(webinar))
              if(isClient) {
                newWebinar.attendees = webinar.attendees.filter((attendee) => attendee._id == id)
              } else {
                newWebinar.attendees = webinar.attendees.length
              }
              return newWebinar
            }),
          }
        }
      } else {
        const user = await this.userModel.findById(id).populate('webinars')
        const { webinars } = user
        return {
          data: {
            pagination: {},
            webinars: webinars.map((webinar) => {
              webinar.attendees = []
              return webinar
            }),
          }
        }
      }
    } catch (error) {
      this.handleErrors.handleExceptions(error)
    }
  }

  /**
   * Finds and retrieves a single webinar based on the given search parameter, which can be either an ID or a slug.
   * This function delegates the actual lookup to the `findWebinar` method and handles any errors that occur during
   * the process. If the webinar is found, it is returned; otherwise, the error is caught and handled appropriately.
   *
   * @public
   * @async
   * @function findOne
   * @param {string} search - The search parameter used to find the webinar, which can be an ID or a slug.
   * @returns {Promise<Webinar>} A promise that resolves to the webinar object if found. If an error occurs,
   *                              it is caught and handled, potentially resulting in the promise rejecting with an error.
   * @throws Handles any exceptions that occur during the webinar lookup process and logs them.
   */
  public findOne = async (search: string): Promise<Webinar> => {
    try {
      return this.findWebinar(search)
    } catch (error) {
      this.handleErrors.handleExceptions(error)
    }
  }

  /**
   * Updates a webinar's details in the database based on the provided ID and update data. The function first checks
   * if the webinar exists. If found, it updates the webinar's name and slug, sets the updated timestamp, and saves
   * the changes. Additionally, it logs the update action with relevant details for auditing purposes.
   *
   * @public
   * @async
   * @function update
   * @param {string} id - The ID of the webinar to be updated.
   * @param {CreateWebinarDto} updateWebinarDto - The DTO containing the updated name for the webinar.
   * @param {User} userRequest - The user object of the requester, used to log who performed the update.
   * @param {string} clientIp - The IP address from which the update request originated, used for logging purposes.
   * @returns {Promise<object>} A promise that resolves to the updated webinar object. If an error occurs,
   *                            it is caught and handled appropriately.
   * @throws {NotFoundException} Throws this exception if no webinar is found with the provided ID.
   * @throws Handles any exceptions that occur during the webinar update process and logs them.
   */
  public update = async (id: string, updateWebinarDto: CreateWebinarDto, userRequest: User, clientIp: string): Promise<object> => {
    try {
      const webinar = await this.webinarModel.findById(id)
      if(!webinar) {
        throw new NotFoundException(error.WEBINAR_NOT_FOUND)
      }
      const { title } = updateWebinarDto
      const slug = this.utils.convertToSlug(title)
      Object.assign(webinar, {
        slug,
        ...updateWebinarDto,
        updatedAt: this.dayjs.getCurrentDateTime()
      })
      await webinar.save()
      await this.trackModel.create({
        ip: clientIp,
        description: `Webinar ${ webinar._id } was updated: ${ JSON.stringify({ title, slug }) }.`,
        module: 'Webinars',
        createdAt: this.dayjs.getCurrentDateTime(),
        user: userRequest.id
      })
      return webinar
    } catch (error) {
      this.handleErrors.handleExceptions(error)
    }
  }

  /**
   * Soft deletes a webinar by marking it as deleted in the database. This function sets the `deleted` flag
   * to true and updates the `updatedAt` and `deletedAt` timestamps. It also logs the action in a tracking model
   * for auditing purposes. If the webinar is not found, a NotFoundException is thrown.
   *
   * @public
   * @async
   * @function remove
   * @param {string} id - The ID of the webinar to be deleted.
   * @param {User} userRequest - The user object of the requester, used to log who performed the deletion.
   * @param {string} clientIp - The IP address from which the deletion request originated, used for logging purposes.
   * @returns {Promise<void>} A promise that resolves when the webinar has been marked as deleted and the action logged.
   * @throws {NotFoundException} Throws this exception if no webinar is found with the provided ID.
   * @throws Handles any exceptions that occur during the deletion process and logs them.
   */
  public remove = async (id: string, userRequest: User, clientIp: string) => {
    try {
      const webinar = await this.webinarModel.findById(id).populate({
        path: 'attendees',
        populate: {
          path: 'webinars'
        }
      })
      if(!webinar) {
        throw new NotFoundException(error.WEBINAR_NOT_FOUND)
      }
      
      const { attendees } = webinar
      const originalAttendees = JSON.parse(JSON.stringify(webinar.attendees))
      for (let index = 0; index < attendees.length; index++) {
        const user = attendees[index];
        const originalWebinars = JSON.parse(JSON.stringify(user.webinars))
        user.webinars = originalWebinars.filter((w) => w._id !== webinar.id)
        await user.save()
      }
      await webinar.updateOne({ 
        deleted: true,
        attendees: [],
        updatedAt: this.dayjs.getCurrentDateTime(),
        deletedAt: this.dayjs.getCurrentDateTime()
      });
      await this.trackModel.create({
        ip: clientIp,
        description: `Webinar ${ webinar._id } was deactivated.`,
        module: 'Webinars',
        createdAt: this.dayjs.getCurrentDateTime(),
        user: userRequest.id
      })
      await this.mail.cancelWebinar(originalAttendees, webinar)
      return
    } catch (error) {
      this.handleErrors.handleExceptions(error)
    }
  }

  public attendWebinar = async (id: string, userRequest: User, clientIp: string) => {
    try {
      const user = await this.userModel.findById(userRequest.id).populate('webinars')
      const webinar = await this.webinarModel.findById(id).populate('attendees')

      if(!webinar) {
        throw new NotFoundException(error.WEBINAR_NOT_FOUND)
      }
      
      const { webinars } = user
      if(webinars.filter((w) => w.id === webinar.id).length) {
        throw new Error(error.USER_ALREADY_WEBINAR)
      }

      webinar.attendees.push(userRequest)
      user.webinars.push(webinar)

      await webinar.save()
      await user.save()

      await this.trackModel.create({
        ip: clientIp,
        description: `User ${ user.email} attend to webinar ${ webinar.title }.`,
        module: 'Webinars',
        createdAt: this.dayjs.getCurrentDateTime(),
        user: userRequest.id
      })
      await this.mail.newAttendee(user, webinar)
      return
    } catch (error) {
      this.handleErrors.handleExceptions(error)
    }
  }
  
  public notAttendWebinar = async (id: string, userRequest: User, clientIp: string) => {
    try {
      const user = await this.userModel.findById(userRequest.id).populate('webinars')
      const webinar = await this.webinarModel.findById(id).populate('attendees')

      if(!webinar) {
        throw new NotFoundException(error.WEBINAR_NOT_FOUND)
      }
      
      const { webinars } = user
      if(webinars.filter((w) => w.id == webinar.id).length === 0) {
        throw new Error(error.USER_NOT_WEBINAR)
      }

      const originalAttendees = JSON.parse(JSON.stringify(webinar.attendees))
      const originalWebinars = JSON.parse(JSON.stringify(user.webinars))
      
      webinar.attendees = originalAttendees.filter((user) => user.id !== user.id)
      user.webinars = originalWebinars.filter((w) => w._id !== webinar.id)

      await webinar.save()
      await user.save()

      await this.trackModel.create({
        ip: clientIp,
        description: `User ${ user.email} not attend to webinar ${ webinar.title }.`,
        module: 'Webinars',
        createdAt: this.dayjs.getCurrentDateTime(),
        user: userRequest.id
      })
      await this.mail.notAttendee(user, webinar)
      return
    } catch (error) {
      this.handleErrors.handleExceptions(error)
    }
  }
  
  public canceledWebinar = async (id: string, userRequest: User, clientIp: string) => {
    try {
      const user = await this.userModel.findById(userRequest.id).populate('webinars')
      const webinar = await this.webinarModel.findById(id).populate('attendees')

      if(!webinar) {
        throw new NotFoundException(error.WEBINAR_NOT_FOUND)
      }
      
      const { webinars } = user
      if(webinars.filter((w) => w.id == webinar.id).length === 0) {
        throw new Error(error.USER_NOT_WEBINAR)
      }

      const originalAttendees = JSON.parse(JSON.stringify(webinar.attendees))
      const originalWebinars = JSON.parse(JSON.stringify(user.webinars))
      
      webinar.attendees = originalAttendees.filter((user) => user.id !== user.id)
      user.webinars = originalWebinars.filter((w) => w._id !== webinar.id)

      await webinar.save()
      await user.save()

      await this.trackModel.create({
        ip: clientIp,
        description: `User ${ user.email} not attend to webinar ${ webinar.title }.`,
        module: 'Webinars',
        createdAt: this.dayjs.getCurrentDateTime(),
        user: userRequest.id
      })
      await this.mail.notAttendee(user, webinar)
      return
    } catch (error) {
      this.handleErrors.handleExceptions(error)
    }
  }
}