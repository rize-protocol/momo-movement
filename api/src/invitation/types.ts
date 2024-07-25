export interface UserInvitationInfo {
  invitationCode: string;
  targetReferralNums: number;
  currentReferralNums: number;
  uncheckedRewards: {
    rewardCoins: number;
    rewardPlays: number;
  };
  checkedLevel: number;
  uncheckedLevel: number;
}
