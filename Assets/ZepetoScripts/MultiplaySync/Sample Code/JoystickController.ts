import { Mathf, Quaternion, Transform, Vector2, Vector3, WaitForSeconds } from 'UnityEngine';
import { EventTrigger, EventTriggerType, PointerEventData } from 'UnityEngine.EventSystems';
import { Entry } from 'UnityEngine.EventSystems.EventTrigger';
import { ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import VehicleController from './VehicleController';

export default class JoystickController extends ZepetoScriptBehaviour {

    public joystickType:JoystickType = JoystickType.Circle;
    public joycon:Transform;
    public maxSpeed:number = 3;
    public maxSize:number = 120;
    public target:VehicleController;
    private firstPos:Vector3;
    private eventTrigger:EventTrigger;
    private minX:number;
    private maxX:number;
    private minY:number;
    private maxY:number;

    private isDrag:boolean = false;

    Start() {

        this.firstPos = this.joycon.transform.position;
        this.eventTrigger = this.GetComponent<EventTrigger>();
        this.minX = this.firstPos.x-this.maxSize;
        this.maxX = this.firstPos.x+this.maxSize;
        this.minY = this.firstPos.y-this.maxSize;
        this.maxY = this.firstPos.y+this.maxSize;

        const entry_PointerDown = new Entry();
        const entry_PointerUp = new Entry();
        const entry_Drag = new Entry();
        const entry_DragEnd = new Entry();
    
        entry_PointerDown.eventID = EventTriggerType.PointerDown;
        entry_PointerUp.eventID = EventTriggerType.PointerUp;
        entry_Drag.eventID = EventTriggerType.Drag;
        entry_DragEnd.eventID = EventTriggerType.EndDrag;

        entry_PointerDown.callback.AddListener( ( eventData:PointerEventData ) => this.onPointDown(eventData) );
        entry_PointerUp.callback.AddListener( ( eventData:PointerEventData ) => this.onPointUp(eventData) );
        entry_Drag.callback.AddListener( ( eventData:PointerEventData ) => this.onDrag(eventData) );
        entry_DragEnd.callback.AddListener( ( eventData:PointerEventData ) => this.onDragEnd(eventData) );

        this.eventTrigger.triggers.Add(entry_PointerDown);
        this.eventTrigger.triggers.Add(entry_PointerUp);
        this.eventTrigger.triggers.Add(entry_Drag);
        this.eventTrigger.triggers.Add(entry_DragEnd);
    }

    /* Main Controller */
    private onPointDown(eventData:PointerEventData) {
        if(this.joystickType == JoystickType.UDSide) {
            this.joycon.position = this.ConvertToVector3(eventData.position);
            this.target.SetHandleValue(JoystickType.UDSide, this.CurSpeed(this.firstPos.y, this.joycon.position.y, true));

        } else if(this.joystickType == JoystickType.RLSide) {
            this.joycon.position = this.ConvertToVector3(eventData.position);
            this.target.SetHandleValue(JoystickType.RLSide, this.CurSpeed(this.firstPos.y, this.joycon.position.x));

        } else if(this.joystickType == JoystickType.ToFront) {
            this.target.SetHandleValue(JoystickType.ToFront, 1);

        } else if(this.joystickType == JoystickType.ToBack) {
            this.target.SetHandleValue(JoystickType.ToBack, -0.4);

        } else if(this.joystickType == JoystickType.ToUp) {
            // this.target.SetHandleValue(JoystickType.ToUp, 1);

        } else if(this.joystickType == JoystickType.ToDown) {
            // this.target.SetHandleValue(JoystickType.ToDown, -0.4);

        } else if(this.joystickType == JoystickType.Handling) {
            this.StopCoroutine(this.ReturnHandle());
        }
    }

    private onPointUp(eventData:PointerEventData) {
        if(this.joystickType == JoystickType.UDSide) {
            this.joycon.position = this.firstPos;
            this.target.SetHandleValue(JoystickType.UDSide);

        } else if(this.joystickType == JoystickType.RLSide) {
            this.joycon.position = this.firstPos;
            this.target.SetHandleValue(JoystickType.RLSide);
            
        } else if(this.joystickType == JoystickType.Circle) {
            this.joycon.position = this.firstPos;

        } else if(this.joystickType == JoystickType.ToFront) {
            this.target.SetHandleValue(JoystickType.ToFront);

        } else if(this.joystickType == JoystickType.ToBack) {
            this.target.SetHandleValue(JoystickType.ToBack);

        } else if(this.joystickType == JoystickType.ToUp) {
            // this.target.SetHandleValue(JoystickType.ToUp);

        } else if(this.joystickType == JoystickType.ToDown) {
            // this.target.SetHandleValue(JoystickType.ToDown);

        }
    }

    private onDrag(eventData:PointerEventData) {
        if(!this.target) return;
        this.isDrag = true;
        if(this.joystickType == JoystickType.UDSide) {
            this.joycon.position = this.ConvertToVector3(eventData.position);
            this.target.SetHandleValue(JoystickType.UDSide, this.CurSpeed(this.firstPos.y, this.joycon.position.y, true));

        } else if(this.joystickType == JoystickType.RLSide) {
            this.joycon.position = this.ConvertToVector3(eventData.position);
            this.target.SetHandleValue(JoystickType.RLSide, this.CurSpeed(this.firstPos.x, this.joycon.position.x));

        } else if(this.joystickType == JoystickType.Circle) {
        } else if(this.joystickType == JoystickType.Handling) {
            const angle = this.ClampAngle(this.ConvertToVector3(eventData.position));
            this.joycon.rotation = Quaternion.Euler(0, 0, angle);
            this.target.SetHandleValue(JoystickType.Handling, 0, this.CurSpeed(0, angle, true));
        }
    }
    
    private onDragEnd(eventData:PointerEventData) {
        if(!this.target) return;
        this.isDrag = false;
        if(this.joystickType == JoystickType.UDSide) {
            this.joycon.position = this.firstPos;
            this.target.SetHandleValue(JoystickType.UDSide);

        } else if(this.joystickType == JoystickType.RLSide) {
            this.joycon.position = this.firstPos;
            this.target.SetHandleValue(JoystickType.RLSide);
            
        } else if(this.joystickType == JoystickType.Circle) {
            this.joycon.position = this.firstPos;

        } else if(this.joystickType == JoystickType.Handling) {
            this.StartCoroutine(this.ReturnHandle());
        }
    }

    /* Sub Controller - Handle */
    private * ReturnHandle() {
        let time = 0;
        const tick = 0.02;
        const wait = new WaitForSeconds(tick);
        while(!this.isDrag) {
            this.joycon.up = Vector3.Lerp(this.joycon.up, Vector3.up, tick*2);
            const angle = this.ClampAngle(this.joycon.up, true);
            this.target.SetHandleValue(JoystickType.Handling, 0, this.CurSpeed(0, angle, true));
            yield wait;
            time += 1
            if(time > 150) break;
        }
    }

    /* Curculator */
    private CurSpeed(firstValue:number, currentValue:number, reverse:boolean = false) {
        const reverseValue = reverse ? -1:1;
        return (this.maxSpeed * (currentValue - firstValue) * reverseValue) / this.maxSize;
    }

    private ClampAngle(point:Vector3, isAngle:boolean = false) {
        const currect:Vector3 = isAngle ? Vector3.zero : this.firstPos;
        const z = Quaternion.FromToRotation(Vector3.up, point - currect).eulerAngles.z;
        return z < 180 ? Mathf.Clamp(z, 0, this.maxSize) : Mathf.Clamp(z-360, -this.maxSize, 0);
    }
    
    /* Converter */
    private ConvertToVector3(vector:Vector2) {
        const x = Mathf.Clamp(vector.x, this.minX, this.maxX);
        const y = Mathf.Clamp(vector.y, this.minY, this.maxY);
        if(this.joystickType == JoystickType.UDSide) {
            return new Vector3(this.firstPos.x, y, 0);

        } else if(this.joystickType == JoystickType.RLSide) {
            return new Vector3(x, this.firstPos.y, 0);

        } else if(this.joystickType == JoystickType.Circle) {
            console.log(`JoystickType.Circle ${x}=${y}`);
            return new Vector3(x, y, 0);

        } else if(this.joystickType == JoystickType.Handling) {
            return new Vector3(x, y, 0);
            
        }
        return this.firstPos;
    }
}

export enum JoystickType {
    Circle,
    RLSide, UDSide,
    ToRight, ToLeft, ToBack, ToFront, ToUp, ToDown,
    Handling
}