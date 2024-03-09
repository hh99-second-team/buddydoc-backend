import {
  Controller,
  Post,
  Param,
  Get,
  Put,
  Body,
  Res,
  Req,
  HttpStatus,
  BadRequestException,
  HttpException,
  Next,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { InfoService } from './info.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InfoDto } from '../myinfo/dto/info.dto';
import { JwtAuthGuard } from 'src/auth/oauth/auth.guard';
import { UserDto } from '../user/dto/user.dto';
import { UserService } from '../user/user.service';
import { NotiService } from '../notifications/noti.service';

@ApiTags('user/my-info')
@Controller('user')
export class InfoController {
  constructor(
    private readonly InfoService: InfoService,
    private readonly userService: UserService,
    private readonly notiService : NotiService
  ) {}

  /**
   * 내 정보/북마크/스터디/게시물 조회
   * @param userDto
   * @returns
   */
  @ApiOperation({
    summary: '내 정보/북마크/스터디/게시물 조회 API',
    description: '내 정보, 관심게시물, 참여스터디, 작성게시물 조회 API입니다.',
  })
  @UseGuards(JwtAuthGuard)
  @Get('/my-:table')
  async getUserInfo(@Body() infoDto: InfoDto, @Res() res: Response, @Req() req: Request) {
    try {
      infoDto.userId = req.user['id'];
      infoDto.name = String(req.params['table']);

      if (!infoDto.userId) throw new HttpException('로그인이 필요한 서비스 입니다', HttpStatus.BAD_REQUEST);

      const methodMap = {
        bookmarks: 'getBookmarks',
        studylists: 'getStudylists',
        posts: 'getPosts',
        noti: 'getNotifications',
      };

      const methodName = methodMap[infoDto.name] || 'getUserInfo';
      console.log(methodName);
      const result = await this.InfoService[methodName](infoDto);

      return res.status(200).json({ result });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
  /**
   * 내 게시물 신청자 관리
   * @param userDto
   * @returns
   */
  @ApiOperation({
    summary: '내 작성게시물 신청자 관리 API',
    description: '내가 작성한 게시물의 신청자를 조회하는 API입니다.',
  })
  @UseGuards(JwtAuthGuard)
  @Get('/my-posts/:postId')
  async getApplicants(@Res() res: Response, @Req() req: Request) {
    try {
      const result = await this.InfoService.getApplicants(Number(req.params['postId']));
      console.log('신청자 관리  ', result);
      return res.status(200).json({ result });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * 신청상태 변경
   * @param res 
   * @param req 
   * @returns 
   */
  @UseGuards(JwtAuthGuard)
  @Post('/my-posts/:postId')
  async myinfoNoti(@Res() res: Response, @Req() req: Request) {
    try {
      const postId = Number(req.params['postId'])
      console.log(req.body ,postId )
      const result = await this.notiService.updateNoti(req.body,postId);
      console.log('신청상태 변경  ', result);
      return res.status(200).json({ result });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * 회원정보 수정
   * @param userDto
   * @param req
   * @returns
   */
  @ApiOperation({
    summary: '회원정보 수정 API',
    description: '회원정보 수정 API 입니다.',
  })
  @UseGuards(JwtAuthGuard)
  @Put('/my-info')
  async updateUserInfo(@Body() userDto: UserDto, @Req() req: Request, @Res() res: Response) {
    try {
      userDto.userId = req.user['id'];

      //닉네임 중복확인
      // const checkId = await this.userService.checkId(userDto.userNickname);
      // console.log('controller 중복확인 ', checkId);
      // if (checkId) return res.status(400).json({ message: '아이디 중복' });

      //정보 수정
      await this.userService.updateUser(userDto);

      //스킬 수정
      await this.userService.updateSkills(userDto.userId, userDto.skillList);

      return res.status(200).json({ message: '회원정보가 수정되었습니다.' });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
