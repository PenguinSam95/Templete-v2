import { BoxCollider, GameObject, Mathf, Time, Transform, Vector3, WaitForEndOfFrame, WaitForSeconds } from 'UnityEngine';
import { ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { Room, RoomData } from 'ZEPETO.Multiplay';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { ZepetoWorldMultiplay } from 'ZEPETO.World';
import SyncIndexManager from '../Common/SyncIndexManager';
import PlayerSync from '../Player/PlayerSync';
import TransformSyncHelper from '../Transform/TransformSyncHelper';

export default class ChairSit extends ZepetoScriptBehaviour {
    
    private m_tfHelper:TransformSyncHelper;
    private multiplay: ZepetoWorldMultiplay;
    private room: Room;
    get Id() {
        return this.m_tfHelper.Id;
    }
    private _isSit:bool = false;
    get IsSit() {
        return this._isSit;
    }
    set IsSit(isSit:bool){
        this._isSit = isSit;
    }
    private boxCol:BoxCollider;
    @SerializeField() private buttonObject:GameObject;

    Start() {
        this.m_tfHelper = this.GetComponent<TransformSyncHelper>();
        this.multiplay = GameObject.FindObjectOfType<ZepetoWorldMultiplay>();
        this.multiplay.RoomJoined += (room: Room) => {
            this.room = room;
            this.room.AddMessageHandler("ChairSitDown", (message:syncChair) => {
                if(this.room.SessionId == message.OwnerSessionId) {
                    this.ButtonOnOff(false);
                }
                if(this.m_tfHelper.Id == message.chairId) {
                    this.PlayerSitDown(message.OwnerSessionId);
                }
            });
            this.room.AddMessageHandler("ChairSitUp", (message:syncChair) => {
                if(this.room.SessionId == message.OwnerSessionId) {
                    this.ButtonOnOff(true);
                }
                if(this.m_tfHelper.Id == message.chairId) {
                    this.PlayerSitUp(message.OwnerSessionId);
                }
            });
        }
        this.boxCol = this.transform.GetComponent<BoxCollider>();
        if(!this.buttonObject) this.buttonObject = this.transform.GetChild(2).gameObject;
    }
    
    /* Button on off */
    ButtonOnOff(onOff:bool) {
        this.boxCol.enabled = onOff;
        this.buttonObject.SetActive(onOff);
    }
    
    /* Sit Chair */
    PlayerSitDown(sessionId:string) {
        if(this.IsSit) return;
        this.IsSit = true;
        this.ButtonOnOff(false);

        if(!ZepetoPlayers.instance.HasPlayer(sessionId) && sessionId != this.room.SessionId) return; // isLocal
        this.StartCoroutine(this.StartContinuousAnimation(sessionId));
    }

    private SitControl(sit:boolean) {
        ZepetoPlayers.instance.LocalPlayer.zepetoPlayer.character.ZepetoAnimator.SetBool("isSit", sit);
    }

    private * StartContinuousAnimation(sessionId:string) {
        const sitPosition = this.transform.GetChild(1);
        const player = ZepetoPlayers.instance.GetPlayer(sessionId).character;
        player.transform.parent = this.transform;
        player.Teleport(sitPosition.position, sitPosition.rotation);

        const anim = player.ZepetoAnimator;
        while(anim.GetBool("isSit")) {
            yield null;
        }
        this.SitControl(true)
        while(true) {
            if(player.tryJump || player.tryMove) {
                this.PlayerSendSitUp()
                break;
            }
            yield null;
        }
    }
    
    /* Send ChairSitUp */
    PlayerSendSitUp() {
        const data = new RoomData();
        data.Add("isSit", false);
        data.Add("chairId", this.m_tfHelper.Id);
        this.room.Send("ChairSit", data.GetObject());
    }

    /* Recieve ChairSitUp */
    private PlayerSitUp(sessionId:string) {
        if(!this.IsSit) return;
        this.IsSit = false;
        this.ButtonOnOff(true);

        if(!ZepetoPlayers.instance.HasPlayer(sessionId) && sessionId != this.room.SessionId) return; // isLocal
        const player = ZepetoPlayers.instance.GetPlayer(sessionId).character;
        player.transform.parent = null;
        this.SitControl(false);
    }
}

interface syncChair {
    chairId: string,
    OwnerSessionId: string,
    onOff: boolean,
}