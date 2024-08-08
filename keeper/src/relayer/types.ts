export type Command =
  | CreateResourceAccountCommand
  | CreateResourceAccountAndMintTokenCommand
  | MintTokenCommand
  | TransferTokenCommand
  | ReferralBonusCommand
  | TaskBonusCommand;

export interface CreateResourceAccountCommand {
  type: 'create_resource_account';
  userAccountHash: string;
}

export interface CreateResourceAccountAndMintTokenCommand {
  type: 'create_resource_account_and_mint_token';
  userAccountHash: string;
  uniId: string;
  amount: string;
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

export interface TaskBonusCommand {
  type: 'task_bonus';
  receipt: string;
  uniId: string;
  amount: string;
}
