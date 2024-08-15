import { GamePlayInfo } from '@/game/types';
import { UserInvitationInfo } from '@/invitation/types';

export class OverviewInfoResponse {
  user: UserInfo;

  game: GamePlayInfo;

  invitation: UserInvitationInfo;

  coins: string;

  evmAddress: string;
}

export class UserInfo {
  telegramId: string;

  accountHash: string;

  resourceAddress: string;
}
