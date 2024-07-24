export class OverviewInfoResponse {
  user: UserInfo;

  game: GameInfo;

  coins: string;
}

export class UserInfo {
  telegramId: number;

  accountHash: string;

  resourceAddress: string;
}

export class GameInfo {
  total: number;

  remaining: number;

  replenishmentIn: number;
}
