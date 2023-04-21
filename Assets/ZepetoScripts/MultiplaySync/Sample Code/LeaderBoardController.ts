import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { LeaderboardAPI, SetScoreResponse } from 'ZEPETO.Script.Leaderboard';

export default class LeaderBoardController extends ZepetoScriptBehaviour {

    // score : "2e670065-b929-4bcc-8c8f-53dd1ecdfb17"
    // visit : "62e89643-0e89-4793-8e7b-4fe0a8f9adbf"
    public leaderboardId:string;
    private static coinStack:number = 0;

    Start() {
    }

    public GetCoin(coin:number) {
        LeaderBoardController.coinStack += coin;
        LeaderboardAPI.SetScore(this.leaderboardId, LeaderBoardController.coinStack, this.OnResult, this.OnError)
    }

    OnResult(result:SetScoreResponse)
    {
        console.log(` ++++++++++++++++++++++++++++++ result : ${result.isSuccess} `);
    }

    OnError(error:string)
    {
        console.log(` ++++++++++++++++++++++++++++++ error : ${error} `);
    }

}