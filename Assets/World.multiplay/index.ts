import {Sandbox, SandboxOptions, SandboxPlayer} from "ZEPETO.Multiplay";
import { DataStorage } from "ZEPETO.Multiplay.DataStorage";
import { HttpContentType, HttpService } from "ZEPETO.Multiplay.HttpService";
import { IReceiptMessage } from "ZEPETO.Multiplay.IWP";
import {Player, sVector3, sQuaternion, SyncTransform, PlayerAdditionalValue, ZepetoAnimationParam, EquipData } from "ZEPETO.Multiplay.Schema";

export default class extends Sandbox {
    private sessionIdQueue: string[] = [];
    private InstantiateObjCaches : InstantiateObj[] = [];
    private masterClient = () => this.loadPlayer(this.sessionIdQueue[0]);
    
    storageMap:Map<string,DataStorage> = new Map<string, DataStorage>();
    trackingMap:Map<string, TrackingData> = new Map<string, TrackingData>();

    onCreate(options: SandboxOptions) {
        /**Zepeto Player Sync**/
        this.onMessage(MESSAGE.SyncPlayer, (client, message) => {
            const player = this.state.players.get(client.sessionId);
            /** State **/
            //animation param
            const animationParam = new ZepetoAnimationParam();
            animationParam.State = message.animationParam.State;
            animationParam.MoveState = message.animationParam.MoveState;
            animationParam.JumpState = message.animationParam.JumpState;
            animationParam.LandingState = message.animationParam.LandingState;
            animationParam.MotionSpeed = message.animationParam.MotionSpeed;
            animationParam.FallSpeed = message.animationParam.FallSpeed;
            animationParam.Acceleration = message.animationParam.Acceleration;
            animationParam.MoveProgress = message.animationParam.MoveProgress;
            animationParam.IsSit = message.animationParam.IsSit;
            player.animationParam = animationParam;
            player.gestureName = message.gestureName; // Gesture Sync

            //additional Value
            if(message.playerAdditionalValue != null) {
                const pAdditionalValue = new PlayerAdditionalValue();
                pAdditionalValue.additionalWalkSpeed = message.playerAdditionalValue.additionalWalkSpeed;
                pAdditionalValue.additionalRunSpeed = message.playerAdditionalValue.additionalRunSpeed;
                pAdditionalValue.additionalJumpPower = message.playerAdditionalValue.additionalJumpPower;
                player.playerAdditionalValue = pAdditionalValue;
            }
        });

        /**Transform Sync**/
        this.onMessage(MESSAGE.SyncTransform, (client, message) => {
            if (!this.state.SyncTransforms.has(message.Id)) {
                const syncTransform = new SyncTransform();
                this.state.SyncTransforms.set(message.Id.toString(), syncTransform);
            }
            const syncTransform:SyncTransform = this.state.SyncTransforms.get(message.Id);
            syncTransform.Id = message.Id;
            syncTransform.position = new sVector3();
            syncTransform.position.x = message.position.x;
            syncTransform.position.y = message.position.y;
            syncTransform.position.z = message.position.z;

            syncTransform.localPosition = new sVector3();
            syncTransform.localPosition.x = message.localPosition.x;
            syncTransform.localPosition.y = message.localPosition.y;
            syncTransform.localPosition.z = message.localPosition.z;
            
            syncTransform.rotation = new sQuaternion();
            syncTransform.rotation.x = message.rotation.x;
            syncTransform.rotation.y = message.rotation.y;
            syncTransform.rotation.z = message.rotation.z;
            syncTransform.rotation.w = message.rotation.w;
            
            syncTransform.scale = new sVector3();
            syncTransform.scale.x = message.scale.x;
            syncTransform.scale.y = message.scale.y;
            syncTransform.scale.z = message.scale.z;
            
            syncTransform.sendTime = message.sendTime;
        });
        this.onMessage(MESSAGE.SyncTransformStatus, (client, message) => {
            const syncTransform:SyncTransform = this.state.SyncTransforms.get(message.Id);
            syncTransform.status = message.Status;
        });

        this.onMessage(MESSAGE.ChangeOwner, (client,message:string) => {
            this.broadcast(MESSAGE.ChangeOwner+message, client.sessionId);
        });
        this.onMessage(MESSAGE.Instantiate, (client,message:InstantiateObj) => {
            const InstantiateObj: InstantiateObj = {
                Id: message.Id,
                prefabName: message.prefabName,
                ownerSessionId: message.ownerSessionId,
                spawnPosition: message.spawnPosition,
                spawnRotation: message.spawnRotation,
            };
            this.InstantiateObjCaches.push(InstantiateObj);
            this.broadcast(MESSAGE.Instantiate, InstantiateObj);
        });
        this.onMessage(MESSAGE.RequestInstantiateCache, (client) => {
            this.InstantiateObjCaches.forEach((obj)=>{
                client.send(MESSAGE.Instantiate, obj);
            });
        });

        /**SyncDOTween**/
        this.onMessage(MESSAGE.SyncDOTween, (client, message: syncTween) => {
            const tween: syncTween = {
                Id: message.Id,
                position: message.position,
                nextIndex: message.nextIndex,
                loopCount: message.loopCount,
                sendTime: message.sendTime,
            };
            this.broadcast(MESSAGE.ResponsePosition + message.Id, tween, {except: this.masterClient()});
        });

        /**Common**/
        this.onMessage(MESSAGE.CheckServerTimeRequest, (client, message) => {
            let Timestamp = +new Date();
            client.send(MESSAGE.CheckServerTimeResponse, Timestamp);
        });
        this.onMessage(MESSAGE.CheckMaster, (client, message) => {
            // console.log(`master->, ${this.sessionIdQueue[0]}`);
            this.broadcast(MESSAGE.MasterResponse, this.sessionIdQueue[0]);
        });
        this.onMessage(MESSAGE.PauseUser, (client) => {
            if(this.sessionIdQueue.includes(client.sessionId)) {
                const pausePlayerIndex = this.sessionIdQueue.indexOf(client.sessionId);
                this.sessionIdQueue.splice(pausePlayerIndex, 1);
                
                if (pausePlayerIndex == 0) {
                    // console.log(`master->, ${this.sessionIdQueue[0]}`);
                    this.broadcast(MESSAGE.MasterResponse, this.sessionIdQueue[0]);
                }
            }
        });
        this.onMessage(MESSAGE.UnPauseUser, (client) => {
            if(!this.sessionIdQueue.includes(client.sessionId)) {
                this.sessionIdQueue.push(client.sessionId);
                this.broadcast(MESSAGE.MasterResponse, this.sessionIdQueue[0]);
            }
        });
        
        /** Track Data Code **/
        this.onMessage(MESSAGE.TrackData, (client: SandboxPlayer, message) => {
            // Https...
            this.DataManager(client, message.TrackData);
        });
        
        /** Sample Code **/
        this.onMessage(MESSAGE.BlockEnter, (client,transformId:string) => {
            this.broadcast(MESSAGE.BlockEnter+transformId, client.sessionId);
        });
        this.onMessage(MESSAGE.BlockExit, (client,transformId:string) => {
            this.broadcast(MESSAGE.BlockExit+transformId, client.sessionId);
        });
        this.onMessage(MESSAGE.SendBlockEnterCache, (client,blockCache) => {
            this.loadPlayer(blockCache.newJoinSessionId)?.send(MESSAGE.BlockEnter+blockCache.transformId, client.sessionId);
        });
        
        this.onMessage(MESSAGE.CoinAcquired, (client,transformId:string) => {
            this.masterClient()?.send(MESSAGE.CoinAcquired+transformId, client.sessionId);
            const player = this.state.players.get(client.sessionId);
            player.score += 10;
            this.broadcast(MESSAGE.CoinGet, client.sessionId);
        });
        
        this.onMessage(MESSAGE.ChairSit, (client: SandboxPlayer, message) => {
            const chairMsg :syncChair = {
                chairId : message.chairId,
                OwnerSessionId : client.sessionId,
                onOff: !message.isSit,
            };
            const msg = message.isSit ? MESSAGE.ChairSitDown : MESSAGE.ChairSitUp;
            this.broadcast(msg, chairMsg);
            // this.broadcast(msg, chairMsg, {except: client});
            // client.send(msg, chairMsg);
        });
        
        this.onMessage(MESSAGE.Equip, (client: SandboxPlayer, message) => {
            let msg = MESSAGE.Equip;
            const equipData:EquipData = new EquipData();
            equipData.sessionId = client.sessionId;
            equipData.itemName = message.name;
            equipData.bone = message.attach;
            equipData.key = client.sessionId +"_"+ message.attach;
            if(this.state.equipDatas.has(equipData.key)) {
                const prevData = this.state.equipDatas.get(equipData.key);
                if(prevData.sessionId == client.sessionId) {
                    equipData.prevItemName = prevData.itemName;
                    msg = MESSAGE.EquipChange;
                }
            }
            this.state.equipDatas.set(equipData.key, equipData);
            client.send(msg, equipData);
        });
        
        this.onMessage(MESSAGE.Unequip, (client: SandboxPlayer, message) => {
            const equipData:EquipData = new EquipData();
            equipData.sessionId = client.sessionId;
            equipData.itemName = null;
            equipData.bone = message.attach;
            equipData.key = client.sessionId +"_"+ message.attach;
            if(this.state.equipDatas.has(equipData.key)) {
                const prevData = this.state.equipDatas.get(equipData.key);
                if(prevData.sessionId == client.sessionId) {
                    equipData.prevItemName = prevData.itemName;
                }
            }
            this.state.equipDatas.delete(equipData.key);
            client.send(MESSAGE.Unequip, equipData);
        });
        
        /** Racing Game **/
        let isStartGame:boolean = false;
        let startServerTime:number;
        this.onMessage(MESSAGE.StartRunningRequest, (client) => {
            if(!isStartGame) {
                isStartGame = true;
                startServerTime = +new Date();

                this.broadcast(MESSAGE.CountDownStart, startServerTime);
            }
        });
        this.onMessage(MESSAGE.FinishPlayer, (client,finishTime:number) => {
            let playerLapTime = (finishTime-startServerTime)/1000;
            // console.log(`${client.sessionId}is enter! ${playerLapTime}`);
            const gameReport: GameReport = {
                playerUserId: client.userId,
                playerLapTime: playerLapTime,
            };
            this.broadcast(MESSAGE.ResponseGameReport, gameReport);
            if(isStartGame) {
                isStartGame = false;
                let gameEndTime:number = +new Date();
                this.broadcast(MESSAGE.FirstPlayerGetIn, gameEndTime);
            }
        });

        /* Private Room */
        this.onMessage("SetPrivate", (client: SandboxPlayer, value: boolean) => {
            console.log(`Try Set Private : ${value}`);
            this.setPrivateRoom(client, value);
        });

        /* Private Room */
        this.onMessage(MESSAGE.Kick, (client: SandboxPlayer, message: string) => {
            this.triKick(client, message)
        });
    }

    async onJoin(client: SandboxPlayer) {
        const player = new Player();
        player.sessionId = client.sessionId;
        if (client.hashCode) {
            player.zepetoHash = client.hashCode;
        }
        if (client.userId) {
            player.zepetoUserId = client.userId;
        }
        const players = this.state.players;
        players.set(client.sessionId, player);
        if(!this.sessionIdQueue.includes(client.sessionId)) {
            this.sessionIdQueue.push(client.sessionId.toString());
        }

        // [DataStorage] 입장한 Player의 DataStorage Load
        const storage: DataStorage = client.loadDataStorage();

        this.storageMap.set(client.sessionId,storage);

        let visit_cnt = await storage.get("VisitCount") as number;
        if (visit_cnt == null) visit_cnt = 0;

        console.log(`[OnJoin] ${client.sessionId}'s visiting count : ${visit_cnt}`)

        // [DataStorage] Player의 방문 횟수를 갱신한다음 Storage Save
        player.visit = visit_cnt;
        await storage.set("VisitCount", ++visit_cnt);

        let coins = await storage.get("Coins") as number;
        if (coins == null) coins = 0;
        console.log(`[OnJoin] ${client.sessionId}'s coin count : ${coins}`)
        player.score = coins;
        await storage.set("Coins", coins);

        // client 객체의 고유 키값인 sessionId 를 사용해서 Player 객체를 관리.
        // set 으로 추가된 player 객체에 대한 정보를 클라이언트에서는 players 객체에 add_OnAdd 이벤트를 추가하여 확인 할 수 있음.
        this.state.players.set(client.sessionId, player);
        // console.log(`join player, ${client.sessionId}`);
    }

    async onLeave(client: SandboxPlayer, consented?: boolean) {
        // console.log(`leave player, ${client.sessionId}`);
        const player = this.state.players.get(client.sessionId);
        console.log(`[onLeave] ${client.sessionId}'s coin count : ${player.score}`)
        await client.loadDataStorage().set("Coins", player.score);
        
        this.state.players.delete(client.sessionId);
        if(this.sessionIdQueue.includes(client.sessionId)) {
            const leavePlayerIndex = this.sessionIdQueue.indexOf(client.sessionId);
            this.sessionIdQueue.splice(leavePlayerIndex, 1);
            if (leavePlayerIndex == 0) {
                // console.log(`master->, ${this.sessionIdQueue[0]}`);
                this.broadcast(MESSAGE.MasterResponse, this.sessionIdQueue[0]);
            }
        }
    }
    
    /* IWP */
    onPurchased(client: SandboxPlayer, receipt: IReceiptMessage) {

        console.log(`[onPurchased] ${client.sessionId}'s receipt itemId : ${receipt.itemId}`)
        
        // Find purchased user by session id
        // const player = this.state.players.get(client.sessionId);

        // Exception handling example
        // if (error condition) {
        //     // The user's ZEM is not wrongfully deducted.  
        //     throw new Error('error message');
        // }

        // If onPurchased is terminated without any logic problems, the user's ZEM will be deducted normally.        

        // Set user stat by item id
        if (receipt.itemId == "potion.haste") {
        } else if (receipt.itemId == "potion.gravity") {
        } else if (receipt.itemId == "sound.bgm") {
        } else {
        }
    }

    /* Data Manager */
    async DataManager(client: SandboxPlayer, trackData:string)
    {
        console.log(`trackData ${trackData}`);
        // if(client != null) return; // TEST 제어기
        const res = await HttpService.postAsync("https://metawill.shop/zepeto/in_moving_data.php", trackData, HttpContentType.ApplicationUrlEncoded);
        console.log(`response ${res.response}`);  
    }

    /* Private Room */
    async setPrivateRoom(client: SandboxPlayer, value: boolean)
    {
        await this.setPrivate(value);
        client.send(MESSAGE.Log, `Room Set Private : ${this.private}`);
    }

    /* Private Room */
    async triKick(client: SandboxPlayer, userId: string)
    {
        let player:SandboxPlayer;
        let sessionId:string;
        for(const ply of this.state.players.values()) {
            if(ply.zepetoUserId == userId) {
                sessionId = ply.sessionId;
                player = this.loadPlayer(sessionId);
            }
        }
        if(player == null || sessionId == null)
            return;

        console.log(`[onKicked] ${player.sessionId} kicked...`)
        await this.kick(player);
        this.broadcast(MESSAGE.Log), `[onKicked] ${player.sessionId} kicked...`;
    }
}

interface syncTween {
    Id: string,
    position: sVector3,
    nextIndex: number,
    loopCount: number,
    sendTime: number,
}

interface syncChair {
    chairId: string,
    OwnerSessionId: string,
    onOff: boolean,
}

interface InstantiateObj{
    Id:string;
    prefabName:string;
    ownerSessionId?:string;
    spawnPosition?:sVector3;
    spawnRotation?:sQuaternion;
}

/** Tracking Data **/
interface TrackingData{
    track:Map<string, string>;
}

/** racing game **/
interface GameReport{
    playerUserId : string;
    playerLapTime : number;
}

enum MESSAGE {
    SyncPlayer = "SyncPlayer",
    SyncTransform = "SyncTransform",
    SyncTransformStatus = "SyncTransformStatus",
    ChangeOwner = "ChangeOwner",
    Instantiate = "Instantiate",
    RequestInstantiateCache = "RequestInstantiateCache",
    ResponsePosition = "ResponsePosition",
    SyncDOTween = "SyncDOTween",
    CheckServerTimeRequest = "CheckServerTimeRequest",
    CheckServerTimeResponse = "CheckServerTimeResponse",
    CheckMaster = "CheckMaster",
    MasterResponse = "MasterResponse",
    PauseUser = "PauseUser",
    UnPauseUser = "UnPauseUser",

    /** Data Code **/
    TrackData = "TrackData",

    /** Sample Code **/
    BlockEnter = "BlockEnter",
    BlockExit = "BlockExit",
    SendBlockEnterCache = "SendBlockEnterCache",
    CoinAcquired = "CoinAcquired",
    CoinGet = "CoinGet",

    ChairSit = "ChairSit",
    ChairSitDown = "ChairSitDown",
    ChairSitUp = "ChairSitUp",

    Log = "Log",
    Kick = "Kick",

    Equip = "Equip",
    EquipChange = "EquipChange",
    Unequip = "Unequip",

    /** Racing Game **/
    StartRunningRequest = "StartRunningRequest",
    FinishPlayer = "FinishPlayer",
    FirstPlayerGetIn = "FirstPlayerGetIn",
    CountDownStart = "CountDownStart",
    ResponseGameReport = "ResponseGameReport"
}

