import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-naver';

export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
  constructor() {
    super({
      clientID: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_SECRET_KEY,
      callbackURL: process.env.NAVER_CALLBACK_URL,
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile, done) {
    console.log(accessToken,refreshToken);
    console.log('네이버 로그인 > ', profile);
    const user = {
      email: profile._json.email,
      password: String(profile.id),
      profileImage: profile.photos,
      nickname: profile.displayName,
      platform:profile.provider
    };

    return done(null,user);
  }
}
