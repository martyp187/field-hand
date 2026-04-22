export interface Player {
  uniqueUserId: string;
  timeLastConnected: string;
}

export interface PlayersFeed {
  players: Player[];
}
