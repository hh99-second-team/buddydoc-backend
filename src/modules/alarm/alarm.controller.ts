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
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/oauth/auth.guard';
import { AlarmService } from './alarm.service';

@ApiTags('alarm')
@Controller()
export class AlarmController {
  constructor(private readonly alarmService: AlarmService) {}

  /**
   * 내 알림 조회
   * @param res
   * @param req
   * @returns
   */
  @ApiOperation({
    summary: '내 알림 조회 API',
    description: '내 알림을 조회하는 API입니다.',
  })
  @UseGuards(JwtAuthGuard)
  @Get('/alarms')
  async getAlarm(@Res() res: Response) {
    try {
      const result = await this.alarmService.getAlarm();
      return res.status(200).json({ result });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
