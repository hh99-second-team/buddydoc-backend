import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Server, Socket } from 'socket.io';
import { MessageDto } from './dto/message.dto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { PostService } from '../posts/posts.service';

interface ExtendedSocket extends Socket {
  userId: string; // Socket 타입을 확장하여 userId 속성을 추가합니다.
  nickname: string;
}
@WebSocketGateway({
  namespace: 'chat', //namespace로 채널?분리, chat이랑 alram이랑 나눌수 있음
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  constructor(
    private readonly chatService: ChatService,
    private jwtService: JwtService,
    private postService: PostService
  ) {}

  afterInit(server: Server) {
    //this.server.setMaxListeners(100); //이벤트리스너 늘리기(너무 많다는 에러가 떠서 )
    console.log('afterInit');
  }

  //연결 상태에 대한 모니터링
  public handleConnection(@ConnectedSocket() client: ExtendedSocket) {
    // 소켓 컨텍스트에서는 HTTP 요청 객체에 직접 접근할 수 없다 (req.user 사용 못함)
    // JWT를 확인하여 사용자를 인증합니다.
    try {
      console.log(`${client.id} 소켓 연결`);
      // // 클라이언트의 요청 헤더에서 JWT를 추출합니다.

      const token = client.handshake.auth.token;
      console.log(' token🎈🎈🎈', token);

      if (!token) {
        console.log('No token provided');
        client.disconnect();
        return { message: '로그인을 해주세요!' };
      }
      const decodedToken = this.jwtService.verify(token);

      // console.log(' handleConnection decodedToken🎈🎈🎈', decodedToken);
      const userId = decodedToken.id;
      const nickname = decodedToken.nickname;
      // console.log(decodedToken) //토큰 찍어봐서 프로필이 있는지 확인
      // client.profileImage = profileImage
      client.userId = userId;
      client.nickname = nickname;

      // client.userId = '27';
      // client.nickname = '닉네임';

      // 클라이언트 객체에 userId를 저장하여, 후속 요청에서 사용자 인증을 수행하도록 합니다.
    } catch (error) {
      console.log('Error during socket connection:', error);
      client.disconnect();
    }
  }

  public handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`${client.id} 소켓 연결 해제`);
  }

  //메세지 보내기<토큰버전>
  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: ExtendedSocket,
    // server: Server, // Socket 타입 대신 확장한 ExtendedSocket 타입을 사용합니다.
    @MessageBody() messageDto: MessageDto
  ) {
    // console.log('messageDto', messageDto);
    console.log('client.userId 현재 로그인한 userId와 nickname', client.userId, client.nickname); // client.userId를 출력하여 확인합니다.
    // console.log('client', client);

    try {
      const user = await this.chatService.getUserInfo(Number(client.userId)); // messageDto.userId 대신 client.userId를 사용합니다.
      // console.log('send-message_______user', user);
      // console.log('jwt에서 가져온 nickname', client.nickname);

      const message = await this.chatService.createMessage(messageDto, +client.userId);
      // this.server
      //   .to(`postRoom-${message.postId}`)
      //   .emit('send-message', { message: message.chat_message, userNickname: user.userNickname });
      this.server.to(`postRoom-${message.postId}`).emit('receive-message', {
        userId: message.userId,
        chatId: message.chatId,
        chat_message: message.chat_message,
        createdAt: message.createdAt,
        users: {
          userNickname: user.userNickname,
          profileImage: user.profileImage,
        },
      });
      // console.log(`메시지 '${message.chat_message}'가 ${user.userNickname}에 의해 ${message.postId} 방에 전송됨`);
      console.log(`메시지 '${message.chat_message}'가 ${client.nickname}에 의해 ${message.postId} 방에 전송됨`);
    } catch (error) {
      console.log('error', error);
    }
  }

  //postId를 받아와서 특정 postId의 메세지들을 조회
  @SubscribeMessage('read-Messages')
  async handleGetMessages(client: ExtendedSocket, payload: { postId: number; lastMessageId?: number }) {
    // const user = await this.chatService.getUserInfo(Number(client.userId));
    // console.log('read-Messages_____user: ', user);
    const { postId, lastMessageId } = payload;
    const result = await this.chatService.getMessagesByPostId(postId, lastMessageId);
    console.log('read-Messages 🎈 result=>>>', result);
    client.emit('read-Messages', result); //getMessages=> 클라이언트에서 발생시키는 이벤트
  }

  //<토큰 버전> //게시글 작성자, 게시글 참가자 확인완료
  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket()
    client: ExtendedSocket,
    // payload: { postId: number }
    // postId: number
    @MessageBody() payload: { postId: number } //랜덤채팅방 같으면 userId가 아닌 userNickname을 받으면 될 듯 채팅방들어오기전에 userNickname입력하게끔
  ) {
    //해당 게시글에 참여하고 있는 유저인지 확인 아니면 해당 게시글에 참여하고 있는 유저가 아닙니다

    // console.log('🎈join-room🎈', payload.postId);
    client.join(`postRoom-${payload.postId}`);

    // const user = await this.chatService.getUserInfo(+client.userId); //user 콘솔 찍어보고 싶은데 토큰이 있어야함
    // const user = await this.chatService.getUserInfo(+client.userId);
    // console.log('useruseruseruseruser🎈🎈🎈', user);

    //게시글 작성자랑 로그인한 사용자가 동일한 경우 채팅방 참여
    const author = await this.chatService.checkExistAuthor(payload.postId);
    // console.log('author 게이트웨이', author.post_userId);

    if (author.post_userId === +client.userId) {
      console.log(`작성자 ${client.nickname}이/가 방에 참여하였습니다.`);
      client.join(`postRoom-${payload.postId}`);
      this.server.to(`post-${payload.postId}`).emit('join-room', {
        content: `작성자 ${client.nickname}가 들어왔습니다.`,
      });
      return;
    }

    //게시글에 참여한 사람인지 확인 해야함 //게시글에 참여한 사람들 목록?
    // const checkParticipated = await this.postService.getParticipantsInPost(payload.postId);
    const checkParticipated = await this.chatService.getUserCheckInPostId(payload.postId);
    // console.log('chatgateway🎈checkParticipated🎈 게시글에 참여한 사람들', checkParticipated);
    //참여하려는 게시글방에 참여하고 있는 유저들 중 현재 로그인한 유저의 userId가 있는 지 확인
    const isUserParticipated = checkParticipated.some((user) => user.noti_userId === +client.userId);
    // console.log('isUserParticipated', isUserParticipated);

    if (!isUserParticipated) {
      console.log(`사용자 ${client.nickname}는 ${payload.postId} 게시글에 참여하고 있지 않습니다.`);
      this.server.to(client.id).emit('error', '이 방에 참여하고 있는 사용자가 아닙니다.');
      return;
    }

    // const joinTime = await this.chatService.getJoinTime(+client.userId, payload.postId)

    // const messages = await this.chatService.getMessageSine(postId, )
    console.log(`소켓 id: ${client.nickname}, ${payload.postId} 방에 입장함`);
    this.server.to(`post-${payload.postId}`).emit('join-room', {
      content: `User ${client.nickname}가 들어왔습니다.`, //${user.userName}
      // users: user, //유저정보를 나타내는건데 위에서 유저 이름만 잘 표기해주면 없어도 되지 않는지
    });
  }

  //채팅방 아예 나갈 때
  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket()
    client: ExtendedSocket,
    @MessageBody() payload: { postId: string }
  ) {
    client.leave(`post-${payload.postId}`);
    // const user = await this.prismaService.users.findUnique({
    //   where: { userId: payload.userId },
    // });
    console.log(`소켓 id: ${client.id}, ${client.userId}가 ${payload.postId} 방에서 나감`);
    this.server.to(`post-${payload.postId}`).emit('leave-room', {
      content: `User ${client.userId}이(가) 나갔습니다.`, //${user.userName}
    });
  }
}
