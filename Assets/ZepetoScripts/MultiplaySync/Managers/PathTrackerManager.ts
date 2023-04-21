import { GameObject, LineRenderer, Mathf, MeshRenderer, SerializeReference, Transform, Vector3, WaitForSeconds } from 'UnityEngine';
import { ZepetoPlayer, ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { Room, RoomData } from 'ZEPETO.Multiplay';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { ZepetoWorldMultiplay } from 'ZEPETO.World';

export default class PathTrackerManager extends ZepetoScriptBehaviour {

    @Header("Data Tracking Quality")
    @SerializeField() private dataQuality:DataQuality = DataQuality.VeryHigh;
    @Header("Axis not to track")
    @SerializeField() private X:boolean = false;
    @SerializeField() private Y:boolean = false;
    @SerializeField() private Z:boolean = false;
    @Header("Visualization")
    @SerializeField() @Tooltip("Value set at Unity execution. Cannot change after execution.") private enableVisualization:boolean = false;
    @SerializeField() private showTracking:boolean = true;

    /* Default Field */
    private multiplay: ZepetoWorldMultiplay;
    private room: Room;
    private player:ZepetoPlayer;
    private line:LineRenderer;
    private point:MeshRenderer;

    /* Tracking Field */
    private tic:number;
    private timer:number;
    private pointMinSize:number = 0.2;
    private pointMaxSize:number = 1.5;
    private enableVisual:boolean;
    private onChangeShowing:boolean = false;

    /* Data */
    private dataArray:Array<TrackDataFormat> = new Array<TrackDataFormat>();
    private pointArray:Map<string, number> = new Map<string, number>();

    Start() {
        this.multiplay = GameObject.FindObjectOfType<ZepetoWorldMultiplay>();
        this.multiplay.RoomJoined += (room: Room) => {
            this.room = room;
            // this.room.AddMessageHandler("ChairSitDown", (message:syncChair) => {
            //     if(this.room.SessionId == message.OwnerSessionId) this.ButtonOnOff(false);
            //     if(this.m_tfHelper.Id == message.chairId) this.PlayerSitDown(message.OwnerSessionId)
            // });
        }
        this.line = this.GetComponentInChildren<LineRenderer>();
        this.point = this.GetComponentInChildren<MeshRenderer>();
        if(!this.line || !this.point) {
            console.error(``);
            return;
        }
        this.line.useWorldSpace = true;
        this.line.positionCount = 0;
        this.enableVisual = this.enableVisualization;
        this.onChangeShowing = !this.showTracking;
        
        this.SwitchDefaultSet();
        this.StartCoroutine(this.StartLoading());
    }

    /* Start Loading Player */
    private * StartLoading() {
        const wait = new WaitForSeconds(0.5);
        while (true) {
            yield wait;
            if (this.room != null && this.room.IsConnected && ZepetoPlayers.instance.HasPlayer(this.room.SessionId)) {
                this.player = ZepetoPlayers.instance.GetPlayer(this.room.SessionId);
                this.StopCoroutine(this.StartLoading());
                this.StartCoroutine(this.StartTrackingPlayer());
                break;
            }
        }
    }

    /* Start Tracking Player */
    private * StartTrackingPlayer() {
        const dataQuality = this.dataQuality;
        const wait = new WaitForSeconds(this.tic);
        let count:number = 0;
        while (true) {
            yield wait;
            count += this.tic;

            /* Processing Data */
            this.ProcessingData(dataQuality);

            /* Draw Data */
            if(this.enableVisual) this.DrawData();
            
            /* Send Data */
            if(count >= this.timer) {
                count = 0;
                this.SendData();
            }
        }
    }

    /* Processing Data */
    private ProcessingData(dataQuality:DataQuality) {
        /* Processing Position */
        const posStr:string = this.SwitchPositionData(dataQuality);

        /* Processing Date Time */
        let cal = new Date();
        const run:RunningTime = {
            [`${cal.toTimeString().split(" ")[0]}`]:posStr,
            // [`${cal.toTimeString().split(" ")[0]}.${cal.getMilliseconds().toString().slice(0,2)}`]:posStr,
        }
        this.pushData( this.player.id, `${cal.getFullYear()}-${cal.getMonth()+1}-${cal.getDate()}`, run);
        cal = undefined;

        /* Tracking Data Viewer */
        if(!this.enableVisual) return;

        /* Set New Point Data */
        if(this.pointArray.has(posStr)) {
            this.pointArray.set(posStr, this.pointArray.get(posStr) +1);
        } else {
            this.pointArray.set(posStr, 1);
        }
        
        /* Showing Tracking Data */
        if(this.onChangeShowing == this.showTracking) return;
        this.onChangeShowing = this.showTracking;
        this.line.enabled = this.showTracking;
        for(const name of this.pointArray.keys()) {
            const find = GameObject.Find(name);
            if(find) find.GetComponent<MeshRenderer>().enabled = this.showTracking;
        }
    }
    
    private pushData(userCode: string, date: string, runningTime: RunningTime) {
        const existingData = this.dataArray.find((data) => data.user_code === userCode && data.date === date);

        if (existingData) {
            existingData.running_time = { ...existingData.running_time, ...runningTime };
        } else {
            this.dataArray.push({
                user_code: userCode,
                date: date,
                running_time: runningTime,
            });
        }
    }

    /* Send Data */
    private SendData() {
        const data = new RoomData();
        const JSON_DATA = JSON.stringify(this.dataArray);
        const PROCESSING_DATA = JSON_DATA.slice(1).slice(0, -1)
        data.Add(MESSAGE.TRACK_DATA, PROCESSING_DATA);
        this.dataArray = [];
        this.room.Send(MESSAGE.TRACK_DATA, data.GetObject());
    }
    
    /* Draw Data */
    private DrawData() {
        if(!this.enableVisual) return;
        const pos = this.GetPos();
        const posArr = pos.split(",");
        const position = new Vector3( +posArr[0], +posArr[1], +posArr[2] );

        if(this.line.positionCount == 0 || this.line.GetPosition(this.line.positionCount-1) != position) {
            this.line.positionCount = this.line.positionCount+1;
            this.line.SetPosition(this.line.positionCount-1, position);
        }

        if(this.pointArray.get(pos) > 1) {
            const find = GameObject.Find(pos);
            find.transform.localScale = Vector3.one
            * Mathf.Clamp(this.pointMinSize + (0.01 * this.pointArray.get(pos)), this.pointMinSize, this.pointMaxSize);
            
        } else {
            const point = GameObject.Instantiate(this.point.gameObject, this.transform) as GameObject;
            point.transform.position = position;
            point.name = pos;
        }
    }

    private GetPos() {
        const running_time = this.dataArray[this.dataArray.length -1].running_time;
        const keys = Object.keys(running_time);
        return running_time[keys[keys.length -1]];
    }
    
    /* Switch Data */
    private SwitchDefaultSet() {
        switch(+this.dataQuality) {
            case DataQuality.VeryHigh :
                this.tic = 0.5;
                this.timer = 60;
                this.pointMaxSize *= 0.2;
                break; 

            case DataQuality.High :
                // this.tic = 0.5;
                this.tic = 1;
                this.timer = 15;
                // this.timer = 120;
                this.pointMaxSize *= 0.6;
                break; 

            case DataQuality.Normal :
                this.tic = 1;
                this.timer = 300;
                this.pointMaxSize *= 1;
                break; 

            case DataQuality.Low :
                this.tic = 1;
                this.timer = 450;
                this.pointMaxSize *= 0.5;
                break; 

            case DataQuality.VeryLow :
                this.tic = 2;
                this.timer = 600;
                this.pointMaxSize *= 0.5;
                break; 

            case DataQuality.CPUTest :
                // this.tic = 0.01;
                this.tic = 1;
                // this.timer = 0.01;
                this.timer = 600;
                this.pointMaxSize *= 1;
                break; 
        }
    }
    
    /* Switch Position Data */
    private SwitchPositionData(dataQuality:DataQuality) {
        const pos = this.player.character.transform.position;
        const x = this.X ? 0 : 1;
        const y = this.Y ? 0 : 1;
        const z = this.Z ? 0 : 1;
        switch(+dataQuality) {
            case DataQuality.VeryHigh :
                return `${x * Mathf.Round(pos.x * 10)/10},${y * Mathf.Round(pos.y * 10)/10},${z * Mathf.Round(pos.z * 10)/10}`; // 0.1

            case DataQuality.High :
                // return `${x * Mathf.Round(pos.x * 2)/2},${y * Mathf.Round(pos.y * 2)/2},${z * Mathf.Round(pos.z * 2)/2}`; // 0.5
                return `${x * Mathf.Floor(pos.x)},${y * Mathf.Floor(pos.y)},${z * Mathf.Floor(pos.z)}`;

            case DataQuality.Normal :
                return `${x * Mathf.Floor(pos.x)},${y * Mathf.Floor(pos.y)},${z * Mathf.Floor(pos.z)}`;

            case DataQuality.Low :
                return `${x * Mathf.Floor(pos.x)},${y * Mathf.Floor(pos.y)},${z * Mathf.Floor(pos.z)}`;

            case DataQuality.VeryLow :
                return `${x * Mathf.Floor(pos.x)},${y * Mathf.Floor(pos.y)},${z * Mathf.Floor(pos.z)}`;

            case DataQuality.CPUTest :
                return `${x * Mathf.Round(pos.x * 1000)/1000},${y * Mathf.Round(pos.y * 1000)/1000},${z * Mathf.Round(pos.z * 1000)/1000}`;

            default :
                return null;
        }
    }
}

interface RunningTime {
    [time: string]: string;
}

interface TrackDataFormat {
    date: string;
    user_code: string;
    running_time:RunningTime;
  }

export enum DataQuality {
    VeryHigh = 1, High = 2, Normal = 3, Low = 4, VeryLow = 5,
    CPUTest = 100,
    // Custom = 101,
}

export enum MESSAGE {
    TRACK_DATA = "TrackData",
}