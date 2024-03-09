import { ForbiddenException, Injectable, NotFoundException, UploadedFile, Sse, MessageEvent } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { NotiDto } from './dto/noti.dto';
import { interval, map, Observable } from 'rxjs';

@Injectable()
export class NotiService {
  constructor(private prisma: PrismaService) {}

  /**
   * 신청보내기
   * @param notiDto
   */
  async sendNotification(notiDto: NotiDto) {
    try {
      const { userId, postId, noti_userId, noti_message, notiStatus, position } = notiDto;
      const result = await this.prisma.notifications.create({
        data: {
          userId: userId,
          postId: postId,
          noti_userId: noti_userId,
          noti_message: noti_message,
          notiStatus: notiStatus,
          position: position,
          createdAt: new Date(),
        },
      });

      return result;
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * 게시물로 userId 불러오기
   * @param postId
   * @returns
   */
  async getUserIdatPost(postId: Number) {
    try {
      const post_userId = await this.prisma.posts.findFirst({
        where: {
          postId: Number(postId),
        },
        select: {
          post_userId: true,
        },
      });

      return post_userId.post_userId;
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * 신청 여부 확인
   * @param notiDto
   * @returns
   */
  async checkNoti(notiDto: NotiDto) {
    try {
      const noti = await this.prisma.notifications.findFirst({
        where: {
          postId: notiDto.postId,
          noti_userId: notiDto.noti_userId,
        },
        select: {
          notiId: true,
        },
      });

      return noti;
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * 신청 수정
   * @param body
   * @param postId
   * @returns
   */
  async updateNoti(body: any, postId: number) {
    try {
      const result = await this.prisma.notifications.update({
        where: {
          notiId: Number(body.notiId),
        },
        data: {
          notiStatus: body.notiStatus,
        },
      });

      return result;
    } catch (error) {
      console.log(error);
    }
  }

  sse(): Observable<MessageEvent> {
    console.log(`sse 테스트`);

    return new Observable((observer) => {
      observer.next({ data: 'New notification' }); // 최초 1회 메시지를 보냅니다.
      observer.complete(); // Observable을 종료합니다.
    });
  }
}
