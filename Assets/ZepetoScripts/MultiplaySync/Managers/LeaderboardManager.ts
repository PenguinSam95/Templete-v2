import { GameObject, Rect, Sprite, Texture, Texture2D, Transform, Vector2, WaitForSeconds } from 'UnityEngine';
import { Button, Text, Image } from 'UnityEngine.UI';
import { Room } from 'ZEPETO.Multiplay';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { GetAllLeaderboardsResponse, GetLeaderboardResponse, GetRangeRankResponse, LeaderboardAPI, ResetRule, SetScoreResponse } from 'ZEPETO.Script.Leaderboard';
import { Users, WorldService, ZepetoWorldHelper, ZepetoWorldMultiplay } from 'ZEPETO.World';
import SyncIndexManager from '../Common/SyncIndexManager';

export default class LeaderboardManager extends ZepetoScriptBehaviour {

    /* Singleton */
    private static _instance: LeaderboardManager = null;
    public static get instance(): LeaderboardManager {
        if (this._instance === null) {
            this._instance = GameObject.FindObjectOfType<LeaderboardManager>();
            if (this._instance === null) {
                this._instance = new GameObject(LeaderboardManager.name).AddComponent<LeaderboardManager>();
            }
        }
        return this._instance;
    }
    
    public multiplay: ZepetoWorldMultiplay;
    public room: Room;
    public buttonAllLeaderboard:Button;
    public buttonLeaderboard:Button;
    public buttonRank:Button;
    public rankPanel:GameObject;
    private rankImages:Image[] = [];

    private Awake() {
        if (LeaderboardManager._instance !== null && LeaderboardManager._instance !== this) {
            GameObject.Destroy(this.gameObject);
        } else {
            LeaderboardManager._instance = this;
            GameObject.DontDestroyOnLoad(this.gameObject);
        }
    }

    Start() {
        if(!this.multiplay)
            this.multiplay = GameObject.FindObjectOfType<ZepetoWorldMultiplay>();
        
        this.multiplay.RoomJoined += (room: Room) => {
            this.room = room;
            this.room.AddMessageHandler("CoinGet", (sessionId:string) => {
                this.GetCoin(10, sessionId);
            });
        }

        /* Leaderboard */
        if(this.buttonAllLeaderboard) {
            this.buttonAllLeaderboard.onClick.AddListener( () => this.GetAllLeaderboards() );
        }
        if(this.buttonLeaderboard) {
            this.buttonLeaderboard.onClick.AddListener( () => this.GetLeaderboard() );
        }
        if(this.buttonRank) {
            this.buttonRank.onClick.AddListener( () => this.GetRangeRank() );
        }
        if(this.rankPanel) {
            this.rankPanel.SetActive(false);
        }

        for(const image of this.rankPanel.GetComponentsInChildren<Image>()) {
            if(image.tag == "Rank") {
                this.rankImages.push(image);
                if(image.name != "Local") {
                    image.gameObject.SetActive(false);
                }
            }
        }
        this.rankImages.sort();
    }

    /* Leaderboard */
    // score : "2e670065-b929-4bcc-8c8f-53dd1ecdfb17"
    // visit : "62e89643-0e89-4793-8e7b-4fe0a8f9adbf"
    GetCoin(coin:number, sessionId:string) {
        if(this.room.SessionId != sessionId)
            return;
        const id = "2e670065-b929-4bcc-8c8f-53dd1ecdfb17";
        SyncIndexManager.Score += coin;
        LeaderboardAPI.SetScore(id, SyncIndexManager.Score, (result:SetScoreResponse) => {
            console.log(` ++++++++++++++++++++++++++++++ result : ${result.isSuccess} ${SyncIndexManager.Score}`);
        }, (error:string) => {
            console.log(` ++++++++++++++++++++++++++++++ error : ${error} `);
        })
    }

    GetAllLeaderboards() {
        LeaderboardAPI.GetAllLeaderboards((result:GetAllLeaderboardsResponse) => {
            console.log(` ++++++++++++++++++++++++++++ result.isSuccess: ${result.isSuccess}`);
            if (result.leaderboards) {
                for (let i = 0; i < result.leaderboards.length; ++i) {
                    const leaderboard = result.leaderboards[i];
                    console.log(` ++++++++++++++++++++++++++++ i: ${i}, id: ${leaderboard.id}, name: ${leaderboard.name}`);
                }
            }
        }, (error:string) => {
            console.error(error);
        });
    }

    GetLeaderboard() {
        const leaderboardId = "2e670065-b929-4bcc-8c8f-53dd1ecdfb17";
        LeaderboardAPI.GetLeaderboard(leaderboardId, (result:GetLeaderboardResponse) => {
            console.log(` ++++++++++++++++++++++++++++ result.isSuccess: ${result.isSuccess}`);
            if (result.leaderboard) {
                console.log(` ++++++++++++++++++++++++++++ id: ${result.leaderboard.id}, name: ${result.leaderboard.name}`);
            }
        }, (error:string) => {
            console.error(error);
        });
    }

    /* Leaderboard + UserInfo */
    GetRangeRank() {
        const leaderboardId = "2e670065-b929-4bcc-8c8f-53dd1ecdfb17";
        console.log(` ++++++++++++++++++++++++++++++++ ${leaderboardId}`);
        let startRank:number = 1;
        let endRank:number = 10000;
        LeaderboardAPI.GetRangeRank(leaderboardId, startRank, endRank, ResetRule.month, false, (result: GetRangeRankResponse) => {
            console.log(`result.isSuccess: ${result.isSuccess}`);
            let ids:string[] = [];
            if (result.rankInfo.totalRankCount) {
                console.log(` ++++++++++++++++++++++++++++ totalRankCount: ${result.rankInfo.totalRankCount} `);
            }
            if (result.rankInfo.myRank) {
                console.log(` ++++++++++++++++++++++++++++ ===Local=== member: ${result.rankInfo.myRank.member}, rank: ${result.rankInfo.myRank.rank}, score: ${result.rankInfo.myRank.score}, name: ${result.rankInfo.myRank.name}`);
            }
            if (result.rankInfo.rankList) {
                for (let i = 0; i < result.rankInfo.rankList.length; ++i) {
                    const rank = result.rankInfo.rankList.get_Item(i);
                    console.log(` ++++++++++++++++++++++++++++ i: ${i}, member: ${rank.member}, rank: ${rank.rank}, score: ${rank.score}, name: ${rank.name}`);
                    ids.push(rank.member);
                }
            }
            if (result.rankInfo.Members) {
                for (let i = 0; i < result.rankInfo.Members.length; ++i) {
                    const mem = result.rankInfo.Members.get_Item(i);
                    console.log(` ++++++++++++++++++++++++++++ i: ${i}, mem: ${mem}`);
                }
            }

            if(!result.isSuccess) return;

            this.rankPanel.SetActive(true);

            for(const image of this.rankPanel.GetComponentsInChildren<Image>()) {
                if(image.tag == "Rank" && image.name == "Local" && result.rankInfo.myRank) {
                    ZepetoWorldHelper.GetProfileTexture(result.rankInfo.myRank.member, (texture:Texture) => {
                        let rect: Rect = new Rect(0, 0, texture.width, texture.height);
                        image.sprite = Sprite.Create(texture as Texture2D, rect, new Vector2(0.5, 0.5));
                        const text = image.GetComponentInChildren<Text>();
                        text.text = "Rank." + result.rankInfo.myRank.rank.toString();
                    }, (error) => {
                        console.log(error);
                    });
                }
            }

            ZepetoWorldHelper.GetUserInfo(ids, (info: Users[]) => {
                for (let i = 0; i < info.length; i++) {
                    console.log(`userId : ${info[i].userOid}, name : ${info[i].name}, zepetoId : ${info[i].zepetoId}`);
                    if(i < this.rankImages.Length) {
                        this.rankImages[i].gameObject.SetActive(true);
                        ZepetoWorldHelper.GetProfileTexture(info[i].userOid, (texture:Texture) => {
                            let rect: Rect = new Rect(0, 0, texture.width, texture.height);
                            this.rankImages[i].sprite = Sprite.Create(texture as Texture2D, rect, new Vector2(0.5, 0.5));
                            const text = this.rankImages[i].GetComponentInChildren<Text>();
                            text.text = info[i].name;
                        }, (error) => {
                            console.log(error);
                        });
                    }
                }
            }, (error) => {
                console.log(error);
            });

        }, (error: string) => {
            console.error(error);
        });
    }

}