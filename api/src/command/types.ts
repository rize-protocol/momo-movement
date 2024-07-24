export type Command = CreateResourceAccountCommand | MintTokenCommand | TransferTokenCommand | ReferralBonusCommand;

export interface CreateResourceAccountCommand {
  type: 'create_resource_account';
  userAccountHash: string;
}

export interface MintTokenCommand {
  type: 'mint_token';
  receipt: string;
  uniId: string;
  amount: string;
}

export interface TransferTokenCommand {
  type: 'transfer_token';
  from: string;
  to: string;
  uniId: string;
  amount: string;
}

export interface ReferralBonusCommand {
  type: 'referral_bonus';
  inviter: string;
  uniId: string;
  amount: string;
}
