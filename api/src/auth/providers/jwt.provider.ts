import { ConfigService } from '@nestjs/config';

export const JwtAccessSecretProvider = {
  provide: 'JWT_ACCESS_SECRET',
  useFactory: (configService: ConfigService): string => {
    return configService.get<string>('JWT_ACCESS_SECRET')!;
  },
  inject: [ConfigService],
};

export const JwtRefreshSecretProvider = {
  provide: 'JWT_REFRESH_SECRET',
  useFactory: (configService: ConfigService): string => {
    return configService.get<string>('JWT_REFRESH_SECRET')!;
  },
  inject: [ConfigService],
};
