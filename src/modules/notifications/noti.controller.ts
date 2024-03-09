import {
  Res,
  Req,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseFilters,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Sse,
  MessageEvent,
  ParamData,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { interval, map, Observable } from 'rxjs';
import { JwtAuthGuard } from 'src/auth/oauth/auth.guard';
import { NotiService } from './noti.service';
import { NotiDto } from './dto/noti.dto';
import { AlarmGateway } from '../alarm/alarm.gateway';
import { AlarmService } from '../alarm/alarm.service';
import { readFileSync } from 'fs';
import { join } from 'path';
import { json } from 'stream/consumers';

@ApiTags('notifications')
@Controller('test')
export class NotiContoller {
  constructor(
    private readonly notiService: NotiService,
    private readonly alarmService: AlarmService,
    private readonly alarmGateway: AlarmGateway
  ) {}
  
  
  // sse(): Observable<MessageEvent> {
  //   console.log(`sse 테스트`);
    
  //   return new Observable(observer => {
  //     observer.next({ data: 'New notification' }); // 최초 1회 메시지를 보냅니다.
  //     observer.complete(); // Observable을 종료합니다.
  //   });
  // }
  @UseGuards(JwtAuthGuard)
  @Post('sse')
  getUserIdandPostId(@Req() req: Request,@Res() response: Response) {
    //testUser.id=req.body.id
    //testUser.message= req.body.message
    
    console.log(req.params)
    console.log( req.user['id'] )
    return response.status(200).json({data:this.notiService.sse()})
  }
  /**
   * 신청하기
   * @param notiDto
   * @param res
   * @param req
   * @returns
   */
  @ApiOperation({
    summary: '스터디 or 프로젝트 신청하기 API',
    description: '게시물에서 스터디혹은 프로젝트 신청하는 API입니다',
  })
  @UseGuards(JwtAuthGuard)
  @Post(':post/noti')
  async createNotification(@Body() notiDto: NotiDto, @Res() res: Response, @Req() req: Request) {
    try {
      const postId = Number(req.params['post']);
      console.log('유저 > ', req.user['id']);
      notiDto.noti_userId = req.user['id'];
      notiDto.postId = postId;
      //게시글 작성자 확인
      notiDto.userId = await this.notiService.getUserIdatPost(postId);
      console.log(' 신청 내역 확인 ', notiDto);
      //신청여부 확인
      const checkNoti = await this.notiService.checkNoti(notiDto);
      if (checkNoti) throw { message: '신청중복' };
      //신청 보내기
      await this.notiService.sendNotification(notiDto);
      //console.log(`${req.body.client} , ${notiDto.noti_message}`)
      //실시간 알림 보내기
      //this.alarmGateway.sendMessageToUser(String(notiDto.userId), notiDto.noti_message);
      await this.alarmService.sendAlarm(notiDto);
      return res.status(200).json({ message: '신청완료' });
    } catch (error) {
      console.log(error);
      throw new BadRequestException('신청에러');
    }
  }
}
