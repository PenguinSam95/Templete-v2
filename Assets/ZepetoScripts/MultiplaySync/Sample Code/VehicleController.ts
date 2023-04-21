import { BoxCollider, GameObject, Mathf, Quaternion, Rigidbody, Time, Transform, Vector3, WaitForSeconds } from 'UnityEngine';
import { Button } from 'UnityEngine.UI';
import { ZepetoContext } from 'Zepeto';
import { UIZepetoPlayerControl, ZepetoCharacter, ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { Room, RoomData } from 'ZEPETO.Multiplay';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { ZepetoWorldMultiplay } from 'ZEPETO.World';
import TransformSyncHelper from '../Transform/TransformSyncHelper';
import JoystickController, { JoystickType } from './JoystickController';

export default class VehicleController extends ZepetoScriptBehaviour {
    
    public buttonGetOut:Button;
    public outPos:Transform;
    public moveSpeed:number = 1;
    public rotSpeed:number = 1;
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
    @SerializeField() private buttonObject:GameObject;
    @SerializeField() private boxCol:BoxCollider;
    @SerializeField() private sitPos:Transform;
    public vehicleType:VehicleType = VehicleType.Car;

    /* Position */
    private valueX:axisData = { accel:0, currentSpeed:0, };
    private valueY:axisData = { accel:0, currentSpeed:0, };
    private valueForward:axisData = { accel:0, currentSpeed:0, };
    private rigid:Rigidbody;

    /* Rotation */
    private rotX:rotationData = { accel:0, accelator:0, currentEuler:0, };
    private rotY:rotationData = { accel:0, accelator:0, currentEuler:0, };
    private rotZ:rotationData = { accel:0, accelator:0, currentEuler:0, };

    /* Handling */
    private steer:handlingData = { speed:0, angleToFront:0, currentEuler:0, };

    /* Fly */
    private isFly:boolean = false;

    Start() {
        this.m_tfHelper = this.GetComponentInParent<TransformSyncHelper>();
        this.multiplay = GameObject.FindObjectOfType<ZepetoWorldMultiplay>();
        this.multiplay.RoomJoined += (room: Room) => {
            this.room = room;
            this.room.AddMessageHandler("ChairSitDown", (message:syncChair) => {
                if(this.room.SessionId == message.OwnerSessionId) this.ButtonOnOff(false);
                if(this.m_tfHelper.Id == message.chairId) this.PlayerSitDown(message.OwnerSessionId)
            });
            this.room.AddMessageHandler("ChairSitUp", (message:syncChair) => {
                if(this.room.SessionId == message.OwnerSessionId) this.ButtonOnOff(true);
                if(this.m_tfHelper.Id == message.chairId) this.PlayerSitUp(message.OwnerSessionId);
            });
        }
        if(!this.boxCol) this.boxCol = this.transform.GetComponent<BoxCollider>();
        if(!this.sitPos) this.sitPos = this.transform.GetChild(1);
        if(!this.buttonObject) this.buttonObject = this.transform.GetChild(2).gameObject;
        if(!this.buttonGetOut) return;
        this.boxCol.enabled = false;
        this.rigid = this.GetComponentInParent<Rigidbody>();
    }
    
    /* Button on off */
    ButtonOnOff(onOff:bool) {
        // this.boxCol.enabled = onOff;
        this.buttonObject.SetActive(onOff);
    }

    /* Sit Animation */
    private SitControl(sessionId:string, sit:boolean) {
        ZepetoPlayers.instance.GetPlayer(sessionId).character.ZepetoAnimator.SetBool("isSit", sit);
    }
    
    /* Sit Chair */
    PlayerSitDown(sessionId:string) {
        if(this.IsSit) return;
        this.IsSit = true;
        this.ButtonOnOff(false);
        
        const player = ZepetoPlayers.instance.GetPlayer(sessionId).character;
        player.transform.parent = this.transform;
        player.Teleport(this.sitPos.position, this.sitPos.rotation);

        if(!ZepetoPlayers.instance.HasPlayer(sessionId) || sessionId != this.room.SessionId) return; // isLocal
        this.ControllerSet();
        this.StartCoroutine(this.StartContinuousAnimation(sessionId));
        this.buttonGetOut.gameObject.SetActive(true);
        this.buttonGetOut.onClick.AddListener( () => this.PlayerSendSitUp() );
    }

    private * StartContinuousAnimation(sessionId:string) {
        const player = ZepetoPlayers.instance.GetPlayer(sessionId).character;
        const anim = player.ZepetoAnimator;
        while(anim.GetBool("isSit")) {
            yield null;
        }
        this.SitControl(sessionId, true);
        
        console.log(` ${player.name} is Sit!! `);
        
        yield new WaitForSeconds(0.1);
        player.characterController.enabled = false;
        player.GetComponent<ZepetoCharacter>().enabled = false;
    }
    
    /* Send ChairSitUp */
    PlayerSendSitUp() {
        this.buttonGetOut.gameObject.SetActive(false);
        this.buttonGetOut.onClick.RemoveListener( this.PlayerSendSitUp );
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

        if(!ZepetoPlayers.instance.HasPlayer(sessionId)) return;
        const player = ZepetoPlayers.instance.GetPlayer(sessionId).character;
        player.transform.parent = null;
        player.Teleport(this.outPos.position, this.outPos.rotation);
        this.SitControl(sessionId, false)

        if(sessionId != this.room.SessionId)  return; // isLocal
        this.ControllerReset();
        player.characterController.enabled = true;
        player.GetComponent<ZepetoCharacter>().enabled = true;
    }
    
    private moveStart:boolean = false;
    private updown:boolean = false;
    private side:boolean = false;
    private FixedUpdate() {
        if(this.moveStart) {
            let movePoint:Vector3;
            let rotPoint:Vector3;
            let time:number;

            /* Main Move */
            if(this.vehicleType == VehicleType.Car) {
                this.speedToAccel(this.valueForward, Time.deltaTime * this.moveSpeed, this.rigid.mass);
                movePoint = this.transform.parent.position + (this.transform.parent.forward * this.valueForward.currentSpeed);
                if(this.valueForward.currentSpeed != 0) {
                    rotPoint = new Vector3(
                        this.transform.parent.eulerAngles.x,
                        this.transform.parent.eulerAngles.y + this.steer.angleToFront,
                        this.transform.parent.eulerAngles.z);
                }

            } else if(this.vehicleType == VehicleType.Tank) {
                this.speedToAccel(this.valueForward, Time.deltaTime * this.moveSpeed, this.rigid.mass);
                movePoint = this.transform.parent.position + (this.transform.parent.forward * this.valueForward.currentSpeed);
                this.rotToAccel(this.rotY, Time.deltaTime * this.rotSpeed, this.rigid.mass);
                rotPoint = new Vector3(
                    this.transform.parent.rotation.eulerAngles.x,
                    this.transform.parent.rotation.eulerAngles.y + this.rotY.accelator,
                    this.transform.parent.rotation.eulerAngles.z);
            }

            /* Gravity */
            if ((this.vehicleType == VehicleType.AirPlane) && this.isFly) {
                // movePoint.y = this.rigid.velocity.y * 0.6; //gravity with gliding
                // this.rigid.velocity = movePoint;
            } else {
                // movePoint.y = this.rigid.velocity.y; //gravity 
                // this.rigid.velocity = movePoint;
            }
            
            this.transform.parent.position = Vector3.Lerp(this.transform.parent.position, movePoint, Time.deltaTime);
            this.transform.parent.eulerAngles = Vector3.Lerp(this.transform.parent.eulerAngles, rotPoint, Time.deltaTime);
        }
    }

    private speedToAccel(value:axisData, speed:number, mass:number) {
        if(value.accel > 0) {
            value.currentSpeed = Mathf.Clamp(value.currentSpeed + (speed/mass), -value.accel, value.accel);
        } else if(value.accel < 0) {
            value.currentSpeed = Mathf.Clamp(value.currentSpeed - (speed/mass), value.accel, -value.accel);
        } else {
            if(value.currentSpeed > 0) {
                value.currentSpeed = Mathf.Clamp(value.currentSpeed - (speed*mass), 0, value.currentSpeed);
            } else if(value.currentSpeed < 0) {
                value.currentSpeed = Mathf.Clamp(value.currentSpeed + (speed*mass), value.currentSpeed, 0);
            }
        }
    }

    private rotToAccel(value:rotationData, speed:number, mass:number) {
        if(value.accel > 0) {
            value.accelator = Mathf.Clamp(value.accelator + (speed/mass), -value.accel, value.accel);
        } else if(value.accel < 0) {
            value.accelator = Mathf.Clamp(value.accelator - (speed/mass), value.accel, -value.accel);
        } else {
            if(value.accelator > 0) {
                value.accelator = Mathf.Clamp(value.accelator - (speed*mass), 0, value.accelator);
            } else if(value.accelator < 0) {
                value.accelator = Mathf.Clamp(value.accelator + (speed*mass), value.accelator, 0);
            }
        }
    }
     
    /* Up Down */
    private * SetTarget() {
        // this.movePoint = this.transform.localPosition;
        // this.moveStart = true;
        // while(true){
        //     this.updown = !this.updown;
        //      if(this.m_tfHelper.isOwner) {
        //         const y = this.updown ? 0 : 7 ;
        //         this.movePoint = new Vector3(this.transform.localPosition.x, y, this.transform.localPosition.z);
        //      }
        //      yield new WaitForSeconds(4);
        // }
     }
     
     /* Side Move */
     private * SetTargetBike() {
         // this.movePoint = this.transform.localPosition;
         // this.moveStart = true;
         // while(true){
         //     this.side = !this.side;
         //      if(this.m_tfHelper.isOwner) {
         //         const z = this.side ? -5 : 5 ;
         //         this.movePoint = new Vector3(this.transform.localPosition.x, this.transform.localPosition.y, z);
         //      }
         //      yield new WaitForSeconds(4);
         // }
     }

     /* Controller Set */
     private ControllerSet() {
        const controller = ZepetoPlayers.instance.gameObject.GetComponentInChildren<UIZepetoPlayerControl>();
        if(this.vehicleType == VehicleType.Bike) {
            return;
        } else if(this.vehicleType == VehicleType.Car) {
            controller.transform.GetChild(0).GetChild(5).gameObject.SetActive(true);
            controller.transform.GetChild(0).GetChild(6).gameObject.SetActive(true);
            const joyConL = controller.transform.GetChild(0).GetChild(5).gameObject.GetComponent<JoystickController>();
            const joyConU = controller.transform.GetChild(0).GetChild(6).GetChild(0).gameObject.GetComponent<JoystickController>();
            const joyConD = controller.transform.GetChild(0).GetChild(6).GetChild(1).gameObject.GetComponent<JoystickController>();
            if(joyConL) joyConL.target = this;
            if(joyConU) joyConU.target = this;
            if(joyConD) joyConD.target = this;

            
        } else if(this.vehicleType == VehicleType.Tank) {
            controller.transform.GetChild(0).GetChild(3).gameObject.SetActive(true);
            controller.transform.GetChild(0).GetChild(4).gameObject.SetActive(true);
            const joyConL = controller.transform.GetChild(0).GetChild(3).gameObject.GetComponent<JoystickController>();
            const joyConR = controller.transform.GetChild(0).GetChild(4).gameObject.GetComponent<JoystickController>();
            if(joyConL) joyConL.target = this;
            if(joyConR) joyConR.target = this;

            
        } else {
            return;
        }
        controller.transform.GetChild(0).GetChild(1).gameObject.SetActive(false);
        controller.transform.GetChild(0).GetChild(2).gameObject.SetActive(false);
    }

    private ControllerReset() {
        const controller = ZepetoPlayers.instance.gameObject.GetComponentInChildren<UIZepetoPlayerControl>();
        if(this.vehicleType == VehicleType.Bike) {
            return;
        } else if(this.vehicleType == VehicleType.Car) {
            controller.transform.GetChild(0).GetChild(5).gameObject.SetActive(false);
            controller.transform.GetChild(0).GetChild(6).gameObject.SetActive(false);
            const joyConL = controller.transform.GetChild(0).GetChild(5).gameObject.GetComponent<JoystickController>();
            const joyConU = controller.transform.GetChild(0).GetChild(6).GetChild(0).gameObject.GetComponent<JoystickController>();
            const joyConD = controller.transform.GetChild(0).GetChild(6).GetChild(1).gameObject.GetComponent<JoystickController>();
            if(joyConL) joyConL.target = null;
            if(joyConU) joyConU.target = null;
            if(joyConD) joyConD.target = null;
            

        } else if(this.vehicleType == VehicleType.Tank) {
            controller.transform.GetChild(0).GetChild(3).gameObject.SetActive(false);
            controller.transform.GetChild(0).GetChild(4).gameObject.SetActive(false);
            const joyConL = controller.transform.GetChild(0).GetChild(3).gameObject.GetComponent<JoystickController>();
            const joyConR = controller.transform.GetChild(0).GetChild(4).gameObject.GetComponent<JoystickController>();
            if(joyConL) joyConL.target = null;
            if(joyConR) joyConR.target = null;


        } else {
            return;
        }
        controller.transform.GetChild(0).GetChild(1).gameObject.SetActive(true);
        controller.transform.GetChild(0).GetChild(2).gameObject.SetActive(true);
    }

     public SetHandleValue(joyConType:JoystickType, speed:number = 0, angle:number = 0) {
        this.moveStart = true;
        if(this.vehicleType == VehicleType.Bike) {

        } else if(this.vehicleType == VehicleType.Car) {
            if(joyConType == JoystickType.Handling) {
                this.steer.angleToFront = angle *2;
            } else if(joyConType == JoystickType.ToFront) {
                this.valueForward.accel = speed * this.moveSpeed;
            } else if(joyConType == JoystickType.ToBack) {
                this.valueForward.accel = speed * this.moveSpeed;
            }

        } else if(this.vehicleType == VehicleType.Tank) {
            if(joyConType == JoystickType.UDSide) {
                this.valueForward.accel = speed * this.moveSpeed;
            } else if(joyConType == JoystickType.RLSide) {
                this.rotY.accel = speed * this.rotSpeed;
            }

        } else {
        }
        // if(joyConType == JoystickType.UDSide) {
        // } else if(joyConType == JoystickType.RLSide) {
        // } else if(joyConType == JoystickType.Circle) {
        // }
    }

}

interface syncChair {
    chairId: string,
    OwnerSessionId: string,
    onOff: boolean,
}

interface axisData {
    accel:number,
    currentSpeed:number,
}

interface rotationData {
    accel:number,
    accelator:number,
    currentEuler:number,
}

interface handlingData {
    speed:number,
    currentEuler:number,
    angleToFront:number,
}

export enum VehicleType {
    Car,
    Bike, // not yet
    Tank,
    Train, // not yet
    Jetpack, // not yet
    AirPlane, // not yet
}